# FinAI — Financial News Intelligence

FinAI analyzes financial news with the ProsusAI FinBERT model and generates a structured extractive summary. It retains the existing React, FastAPI, Hugging Face Transformers, and MongoDB stack.

## Architecture
- `client/`: active React application (Create React App)
- `Backend/`: FastAPI service, FinBERT inference, optional MongoDB history persistence
- `client/client/`: nested Create React App starter copy; not the active UI

## Requirements
- Python 3.10+
- Node.js 18+ and npm
- MongoDB (optional; API starts without it)
- Internet access on first model startup to download FinBERT weights, unless already cached

## Backend
```bash
cd Backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The first startup may take time while model weights download. Check `http://127.0.0.1:8000/health` and API docs at `http://127.0.0.1:8000/docs`.

Copy `.env.example` to `.env` and configure the process environment:
- `CORS_ORIGINS`: comma-separated allowed frontend origins
- `MAX_NEWS_CHARS`: request size limit (default 20,000)
- `FINBERT_MODEL`: Hugging Face model ID
- `MONGODB_URI` / `MONGODB_DATABASE`: optional history persistence

The API reads environment variables directly. Use a process manager/container environment or add `python-dotenv` if automatic `.env` loading is required.

## Frontend
```bash
cd client
npm ci
npm start
```

Set `REACT_APP_API_URL` before starting/building to use a non-default API URL (default `http://127.0.0.1:8000`). Production build: `npm run build`. Tests: `npm test -- --watchAll=false`.

## API
- `GET /health`: model and optional database readiness
- `POST /process-news`: accepts `{"text":"..."}` and returns dominant sentiment, confidence, class probabilities, and summary

Sentiment inference currently evaluates the first 512 characters to respect the model context window; the full validated article is passed to the summary routine.

## Limitations
- The summary generator is heuristic/extractive, not a generative model.
- FinBERT classifies language; it does not forecast stock returns or provide investment advice.
- MongoDB persistence stores analysis outputs; no accounts or history retrieval endpoints currently exist.
- Configure CORS to exact deployed frontend origins before public deployment.
