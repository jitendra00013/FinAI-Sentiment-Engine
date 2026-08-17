# 📈 FinAI: Financial News Sentiment & Summarization Engine

An end-to-end full-stack Artificial Intelligence platform designed to analyze financial news, compute market sentiment scores using Deep Learning models, and generate dynamic executive summaries for stock investors.

---

## 🚀 Key Features

- **FinBERT Deep Learning Pipeline:** High-precision sentiment classification (Positive, Negative, Neutral) fine-tuned for financial domain text.
- **Dynamic Text Summarizer:** Extractive summary generator tailored to automatically adjust output based on article length (short alerts vs 5,000-word reports).
- **Interactive UI Dashboard:** Dark-themed responsive React interface complete with visual probability progress bars and one-click copy options.
- **Database Persistence:** Real-time data logging into MongoDB for historical query records.

---

## 🛠️ Tech Stack

- **Frontend:** React.js, JavaScript (ES6+), CSS3
- **Backend:** Python, FastAPI, Uvicorn
- **AI/NLP Models:** Hugging Face Transformers (`ProsusAI/finbert`)
- **Database:** MongoDB (Local / Atlas)

---

## 💻 Local Setup & Installation

### 1. Backend Setup
```bash
cd Backend
pip install -r requirements.txt # or pip install fastapi uvicorn pymongo transformers torch
python -m uvicorn main:app --reload --port 8000
2. Frontend Setup
Bash
cd client
npm install
npm start