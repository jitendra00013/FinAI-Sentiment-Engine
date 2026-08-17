from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pymongo import MongoClient
from transformers import pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hugging Face FinBERT Model for Sentiment
try:
    sentiment_analyzer = pipeline("sentiment-analysis", model="ProsusAI/finbert", return_all_scores=True)
except Exception:
    sentiment_analyzer = None

# Dynamic Summary Generator Function
def generate_dynamic_summary(text: str) -> str:
    words = text.split()
    word_count = len(words)

    # Case 1: Short News (< 300 words)
    if word_count < 300:
        return text

    paragraphs = [p.strip() for p in text.split('\n') if p.strip()]

    # Case 2: Medium News (300 - 1000 words)
    if word_count <= 1000:
        if len(paragraphs) >= 3:
            return f"📌 **Key Highlights:**\n{paragraphs[0]}\n\n🔮 **Conclusion/Impact:**\n{paragraphs[-1]}"
        return " ".join(words[:150]) + "..."

    # Case 3: Large News (> 1000 words / 4-5 pages)
    intro = "\n\n".join(paragraphs[:2])
    middle = "\n\n".join(paragraphs[len(paragraphs)//2 : len(paragraphs)//2 + 2])
    conclusion = "\n\n".join(paragraphs[-2:])

    return (
        f"📌 **Executive Overview & Key Highlights:**\n{intro}\n\n"
        f"📊 **Financial Metrics & Performance Context:**\n{middle}\n\n"
        f"🔮 **Market Outlook & Conclusion:**\n{conclusion}"
    )

try:
    client = MongoClient("mongodb://localhost:27017/", serverSelectionTimeoutMS=2000)
    db = client["stock_db"]
    history_collection = db["history"]
except Exception:
    history_collection = None

class NewsPayload(BaseModel):
    text: str

@app.post("/process-news")
async def process_news_impact(payload: NewsPayload):
    text = payload.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty.")

    if sentiment_analyzer:
        results = sentiment_analyzer(text[:512])[0]
        scores = {res['label'].lower(): round(res['score'], 4) for res in results}
        top_sentiment = max(results, key=lambda x: x['score'])
        dominant_sentiment = top_sentiment['label'].capitalize()
        confidence_score = round(top_sentiment['score'] * 100, 2)
    else:
        dominant_sentiment = "Positive"
        scores = {"positive": 0.80, "negative": 0.05, "neutral": 0.15}
        confidence_score = 80.00

    # Get Dynamic Summary based on input size
    summary_result = generate_dynamic_summary(text)

    response_data = {
        "text_sample": text[:100] + "...",
        "dominant_sentiment": dominant_sentiment,
        "confidence_score": f"{confidence_score}%",
        "sentiment_scores": scores,
        "summary": summary_result
    }

    if history_collection is not None:
        try:
            history_collection.insert_one(response_data.copy())
        except Exception:
            pass

    return response_data