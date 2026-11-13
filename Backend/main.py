import os
import logging
from functools import lru_cache
from typing import Dict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict
from pymongo import MongoClient
from transformers import pipeline

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("finai")

APP_ENV = os.getenv("APP_ENV", "development").lower()
MAX_NEWS_CHARS = int(os.getenv("MAX_NEWS_CHARS", "20000"))
MODEL_NAME = os.getenv("FINBERT_MODEL", "ProsusAI/finbert")
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "stock_db")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
    if origin.strip()
]

app = FastAPI(
    title="FinAI Sentiment Engine",
    description="Financial news sentiment analysis and summarization API.",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

@lru_cache(maxsize=1)
def get_sentiment_analyzer():
    """Load FinBERT once per process; fail explicitly rather than inventing scores."""
    return pipeline("sentiment-analysis", model=MODEL_NAME, top_k=None)

try:
    sentiment_analyzer = get_sentiment_analyzer()
    model_error = None
except Exception as exc:
    logger.exception("Unable to load sentiment model")
    sentiment_analyzer = None
    model_error = str(exc)

mongo_client = None
history_collection = None
try:
    mongo_client = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=2000)
    mongo_client.admin.command("ping")
    history_collection = mongo_client[MONGODB_DATABASE]["history"]
except Exception:
    logger.exception("MongoDB is unavailable; history persistence is disabled")
    if mongo_client is not None:
        mongo_client.close()
    mongo_client = None

class NewsPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=MAX_NEWS_CHARS)

def generate_dynamic_summary(text: str) -> str:
    words = text.split()
    word_count = len(words)
    if word_count < 300:
        return text

    paragraphs = [paragraph.strip() for paragraph in text.splitlines() if paragraph.strip()]
    if word_count <= 1000:
        if len(paragraphs) >= 3:
            return (
                f"KEY HIGHLIGHTS:\n{paragraphs[0]}\n\n"
                f"CONCLUSION / IMPACT:\n{paragraphs[-1]}"
            )
        return " ".join(words[:150]) + "…"

    if not paragraphs:
        return " ".join(words[:300]) + "…"

    midpoint = len(paragraphs) // 2
    intro = "\n\n".join(paragraphs[:2])
    middle = "\n\n".join(paragraphs[max(0, midpoint - 1): midpoint + 1])
    conclusion = "\n\n".join(paragraphs[-2:])
    return (
        f"EXECUTIVE OVERVIEW & KEY HIGHLIGHTS:\n{intro}\n\n"
        f"FINANCIAL METRICS & PERFORMANCE CONTEXT:\n{middle}\n\n"
        f"MARKET OUTLOOK & CONCLUSION:\n{conclusion}"
    )

@app.get("/health")
async def health():
    return {
        "status": "ok" if sentiment_analyzer is not None else "degraded",
        "model_loaded": sentiment_analyzer is not None,
        "history_enabled": history_collection is not None,
        "model": MODEL_NAME,
    }

@app.post("/process-news")
async def process_news_impact(payload: NewsPayload):
    news_text = payload.text.strip()
    if not news_text:
        raise HTTPException(status_code=422, detail="Please provide financial news text.")
    if sentiment_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="The FinBERT model is unavailable. Check backend logs and model connectivity, then restart the API.",
        )

    try:
        # The pipeline truncates consistently to the model's supported context window.
        results = sentiment_analyzer(news_text[:512])
        if results and isinstance(results[0], list):
            results = results[0]
        scores: Dict[str, float] = {
            item["label"].lower(): round(float(item["score"]), 4)
            for item in results
        }
        top_sentiment = max(results, key=lambda item: item["score"])
    except Exception as exc:
        logger.exception("Sentiment inference failed")
        raise HTTPException(status_code=502, detail="Sentiment analysis failed. Please try again.") from exc

    confidence_score = round(float(top_sentiment["score"]) * 100, 2)
    response_data = {
        "text_sample": news_text[:100] + ("…" if len(news_text) > 100 else ""),
        "dominant_sentiment": top_sentiment["label"].capitalize(),
        "confidence_score": f"{confidence_score:.2f}%",
        "sentiment_scores": scores,
        "summary": generate_dynamic_summary(news_text),
    }

    if history_collection is not None:
        try:
            history_collection.insert_one(response_data.copy())
        except Exception:
            logger.exception("Unable to persist analysis history")

    return response_data
