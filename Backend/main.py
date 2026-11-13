import logging
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pymongo import MongoClient
from transformers import pipeline

load_dotenv()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("finai")

MODEL_NAME = os.getenv("FINBERT_MODEL", "ProsusAI/finbert")
MAX_INPUT_CHARACTERS = int(os.getenv("MAX_INPUT_CHARACTERS", "20000"))
CHUNK_TOKEN_LIMIT = 450
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017/")

sentiment_analyzer = None
history_collection = None
mongo_client = None


@asynccontextmanager
async def lifespan(_: FastAPI):
    global sentiment_analyzer, history_collection, mongo_client

    logger.info("Loading financial sentiment model: %s", MODEL_NAME)
    try:
        sentiment_analyzer = pipeline(
            "text-classification",
            model=MODEL_NAME,
            tokenizer=MODEL_NAME,
            device=-1,
        )
        logger.info("FinBERT model loaded successfully")
    except Exception:
        sentiment_analyzer = None
        logger.exception("FinBERT could not be loaded; analysis will be unavailable")

    try:
        mongo_client = MongoClient(
            MONGODB_URI,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=3000,
        )
        history_collection = mongo_client["stock_db"]["history"]
        logger.info("MongoDB history storage configured")
    except Exception:
        mongo_client = None
        history_collection = None
        logger.exception("MongoDB initialization failed; history storage is disabled")

    yield

    if mongo_client is not None:
        mongo_client.close()
    sentiment_analyzer = None
    history_collection = None
    mongo_client = None


app = FastAPI(
    title="FinAI Sentiment Engine API",
    description="Financial news sentiment analysis and executive summaries.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)


class NewsPayload(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=MAX_INPUT_CHARACTERS,
        description="Financial news text to analyze.",
    )


def analyze_sentiment(text: str) -> tuple[str, dict[str, float], float, int]:
    """Analyze the complete input in chunks sized for the FinBERT context window."""
    if sentiment_analyzer is None:
        raise RuntimeError("The FinBERT model is not available.")

    tokenizer = sentiment_analyzer.tokenizer
    token_ids = tokenizer.encode(text, add_special_tokens=False)
    if not token_ids:
        raise ValueError("Please provide text containing readable words.")

    chunks = [
        tokenizer.decode(
            token_ids[index:index + CHUNK_TOKEN_LIMIT],
            skip_special_tokens=True,
        )
        for index in range(0, len(token_ids), CHUNK_TOKEN_LIMIT)
    ]
    chunks = [chunk for chunk in chunks if chunk.strip()]
    predictions = sentiment_analyzer(
        chunks,
        top_k=None,
        truncation=True,
        max_length=512,
    )

    totals = {"positive": 0.0, "negative": 0.0, "neutral": 0.0}
    total_weight = 0

    for index, prediction in enumerate(predictions):
        if prediction and isinstance(prediction[0], dict):
            chunk_scores = prediction
        else:
            chunk_scores = prediction[0] if prediction else []

        weight = len(tokenizer.encode(chunks[index], add_special_tokens=False))
        if not weight:
            continue

        for item in chunk_scores:
            label = str(item.get("label", "")).lower()
            if label in totals:
                totals[label] += float(item.get("score", 0.0)) * weight
        total_weight += weight

    if not total_weight:
        raise RuntimeError("FinBERT did not return usable sentiment scores.")

    scores = {
        label: round(value / total_weight, 4)
        for label, value in totals.items()
    }
    score_sum = sum(scores.values())
    if score_sum:
        scores = {label: round(value / score_sum, 4) for label, value in scores.items()}

    dominant = max(scores, key=scores.get)
    return dominant.capitalize(), scores, round(scores[dominant] * 100, 2), len(chunks)


def generate_dynamic_summary(text: str) -> str:
    """Create a lightweight extractive overview; this is not a generative model."""
    words = text.split()
    word_count = len(words)

    if word_count < 300:
        return text

    paragraphs = [paragraph.strip() for paragraph in text.splitlines() if paragraph.strip()]

    if word_count <= 1000:
        if len(paragraphs) >= 3:
            return (
                f"Key Highlights:\n{paragraphs[0]}\n\n"
                f"Conclusion / Impact:\n{paragraphs[-1]}"
            )
        return " ".join(words[:150]) + "..."

    intro = "\n\n".join(paragraphs[:2])
    middle_start = len(paragraphs) // 2
    middle = "\n\n".join(paragraphs[middle_start:middle_start + 2])
    conclusion = "\n\n".join(paragraphs[-2:])

    return (
        f"Executive Overview & Key Highlights:\n{intro}\n\n"
        f"Financial Metrics & Performance Context:\n{middle}\n\n"
        f"Market Outlook & Conclusion:\n{conclusion}"
    )


@app.get("/health")
async def health_check() -> dict[str, Any]:
    return {
        "status": "ok",
        "model_loaded": sentiment_analyzer is not None,
        "history_storage_configured": history_collection is not None,
    }


@app.post("/process-news")
async def process_news_impact(payload: NewsPayload) -> dict[str, Any]:
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    if len(text) > MAX_INPUT_CHARACTERS:
        raise HTTPException(
            status_code=413,
            detail=f"Text exceeds the {MAX_INPUT_CHARACTERS:,}-character limit.",
        )

    if sentiment_analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="The FinBERT model is unavailable. Check backend logs and model access, then restart the API.",
        )

    try:
        dominant, scores, confidence, analyzed_chunks = await run_in_threadpool(
            analyze_sentiment, text
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:
        logger.exception("Sentiment inference failed")
        raise HTTPException(
            status_code=500,
            detail="Sentiment analysis failed. Please try again.",
        ) from error

    response_data = {
        "text_sample": text[:100] + ("..." if len(text) > 100 else ""),
        "dominant_sentiment": dominant,
        "confidence_score": f"{confidence:.2f}%",
        "sentiment_scores": scores,
        "summary": generate_dynamic_summary(text),
        "analyzed_chunks": analyzed_chunks,
        "summary_method": "extractive",
    }

    if history_collection is not None:
        try:
            history_collection.insert_one(
                {**response_data, "created_at": datetime.now(timezone.utc)}
            )
        except Exception:
            logger.exception("Analysis completed, but MongoDB history write failed")

    return response_data
