# FinAI — Financial Sentiment Engine

FinAI analyzes financial news with the domain-specific **ProsusAI/finbert** model and returns a sentiment distribution, confidence score, and a lightweight extractive overview. The React dashboard presents those results in a responsive interface.

> **Important:** FinAI is an educational analysis tool, not investment advice. Sentiment scores are model predictions and should not be treated as a trading signal.

## Features

- Financial-domain sentiment classification: positive, negative, and neutral
- Token-aware chunking for longer input articles
- Extractive overview for long text (not a generative summarization model)
- Responsive React dashboard with accessible form controls and loading/error states
- Optional MongoDB persistence for analysis history
- Health endpoint for checking model and history-storage availability

## Technology

| Layer | Technology |
| --- | --- |
| Frontend | React, JavaScript, CSS |
| API | Python, FastAPI, Uvicorn |
| NLP | Hugging Face Transformers, ProsusAI/finbert |
| Persistence | MongoDB, PyMongo |

## Prerequisites

- Python 3.10 or newer
- Node.js 18 or newer and npm
- Internet access on first startup to download the FinBERT model
- MongoDB is optional; analysis remains available without it

## Run locally

### 1. Backend

From the repository root:

~~~bash
cd Backend
python -m venv .venv
~~~

Activate the environment:

- Windows PowerShell: .venv\\Scripts\\Activate.ps1
- macOS/Linux: source .venv/bin/activate

Install dependencies:

~~~bash
pip install -r requirements.txt
~~~

Copy .env.example to .env and adjust MONGODB_URI and CORS_ORIGINS if needed. Then start the API:

~~~bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
~~~

API docs: http://127.0.0.1:8000/docs · Health: http://127.0.0.1:8000/health

The first launch downloads FinBERT and can take time. If the model cannot be loaded, the API reports that analysis is unavailable rather than returning fabricated scores.

### 2. Frontend

Open a second terminal at the repository root:

~~~bash
cd client
npm install
~~~

Optionally copy .env.example to .env and set REACT_APP_API_URL to your backend URL. Start the development server:

~~~bash
npm start
~~~

The app opens at http://localhost:3000.

### 3. Run frontend tests and production build

From client/:

~~~bash
npm test -- --watchAll=false
npm run build
~~~

## API

### GET /health

Returns whether the API is running, whether FinBERT loaded, and whether MongoDB history storage is configured.

### POST /process-news

Request:

~~~json
{
  "text": "The company reported stronger-than-expected quarterly revenue..."
}
~~~

Response fields:

- dominant_sentiment: highest-scoring sentiment label
- confidence_score: probability of the dominant class as a percentage
- sentiment_scores: normalized positive, negative, and neutral probabilities
- summary: source-text extractive overview
- summary_method: currently extractive
- analyzed_chunks: number of FinBERT-sized chunks evaluated
- text_sample: short preview of the submitted text

Input is limited to 20,000 characters by default. Configure this using MAX_INPUT_CHARACTERS.

## Configuration

Backend variables are documented in Backend/.env.example. Frontend API configuration is documented in client/.env.example. Never commit real credentials or production secrets.

## Operational notes

- Configure CORS_ORIGINS with the exact frontend origins used in deployment; do not use wildcard origins with credentials.
- MongoDB is optional. If it is unavailable, sentiment analysis still works and the history-write failure is logged.
- FinBERT runs on CPU by default. Production deployments should size compute resources for model memory and inference latency.
- The extractive summary is a heuristic overview, not a semantic/generative summary.
- Use HTTPS, authentication/rate limiting, and appropriate privacy controls before exposing the API publicly.

## Project structure

~~~text
FinAI-Sentiment-Engine/
├── Backend/
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── client/
│   ├── public/
│   ├── src/
│   └── .env.example
└── README.md
~~~
