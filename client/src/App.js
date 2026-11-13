import React, { useState } from 'react';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
const MAX_CHARACTERS = 20000;
const SENTIMENTS = ['positive', 'negative', 'neutral'];

function getSentimentClass(sentiment) {
  const normalized = String(sentiment || '').toLowerCase();
  return SENTIMENTS.includes(normalized) ? normalized : 'neutral';
}

function SentimentBar({ type, value }) {
  const percentage = Math.max(0, Math.min(100, Number(value || 0) * 100));
  return (
    <div className="sentiment-row">
      <div className="sentiment-row__labels">
        <span className="sentiment-row__name"><span className={'sentiment-dot sentiment-dot--' + type} />{type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <span className="sentiment-row__value">{percentage.toFixed(1)}%</span>
      </div>
      <div className="progress-track" role="progressbar" aria-label={type + ' sentiment probability'} aria-valuenow={percentage} aria-valuemin="0" aria-valuemax="100">
        <div className={'progress-fill progress-fill--' + type} style={{ width: percentage + '%' }} />
      </div>
    </div>
  );
}

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async (event) => {
    event.preventDefault();
    if (!text.trim()) {
      setError('Add some financial news or market commentary before analyzing.');
      return;
    }
    setLoading(true);
    setError('');
    setCopied(false);
    setResult(null);
    try {
      const response = await fetch(API_BASE_URL + '/process-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || 'Analysis failed (' + response.status + '). Please try again.');
      if (!data.dominant_sentiment || !data.sentiment_scores || !data.summary) {
        throw new Error('The analysis service returned an incomplete response. Please try again.');
      }
      setResult(data);
    } catch (requestError) {
      setError(requestError.message === 'Failed to fetch'
        ? 'Unable to reach the FinAI API. Check that the backend is running and REACT_APP_API_URL is correct.'
        : requestError.message || 'Something went wrong while analyzing this article.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result || !result.summary) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Clipboard access was blocked. Select the summary text and copy it manually.');
    }
  };

  const handleClear = () => {
    setText('');
    setResult(null);
    setError('');
    setCopied(false);
  };

  const sentimentClass = getSentimentClass(result && result.dominant_sentiment);

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="FinAI home">
          <span className="brand__mark" aria-hidden="true">F</span>
          <span className="brand__name">fin<span>ai</span></span>
        </a>
        <div className="topbar__right">
          <span className="system-status"><span className="status-pulse" /> AI analysis workspace</span>
          <span className="topbar__divider" />
          <span className="topbar__label">FINANCIAL INTELLIGENCE</span>
        </div>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow__line" /> MARKET INTELLIGENCE, SIMPLIFIED</div>
          <h1>Understand the story<br /><span>behind the market.</span></h1>
          <p className="hero__description">Turn financial news into clear sentiment signals and concise takeaways, powered by domain-specific AI.</p>
        </section>

        <section className="workspace" aria-label="Financial news analysis">
          <form className="panel input-panel" onSubmit={handleAnalyze}>
            <div className="panel-heading">
              <div><div className="section-kicker">01 / INPUT</div><h2>Analyze an article</h2><p>Paste a financial headline, news story, or earnings update.</p></div>
              <span className="panel-icon" aria-hidden="true">↗</span>
            </div>
            <label className="field-label" htmlFor="news-input">Financial news content</label>
            <textarea id="news-input" className="news-input" value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX_CHARACTERS))}
              placeholder={'Paste your financial news here...\n\nFor example: Company shares rose after reporting stronger-than-expected quarterly revenue...'}
              rows={9} maxLength={MAX_CHARACTERS} aria-describedby="input-hint character-count" disabled={loading} />
            <div className="input-meta"><span id="input-hint">Your text is analyzed by FinBERT.</span><span id="character-count" className={text.length >= MAX_CHARACTERS ? 'count-limit' : ''}>{text.length.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}</span></div>

            {error && <div className="alert alert--error" role="alert"><span aria-hidden="true">!</span><p>{error}</p><button type="button" className="alert__dismiss" onClick={() => setError('')} aria-label="Dismiss error">×</button></div>}

            <div className="form-actions">
              <button className="button button--primary" type="submit" disabled={loading || !text.trim()}>
                {loading ? <><span className="spinner" /> Analyzing with FinBERT...</> : <>Analyze market sentiment <span aria-hidden="true">→</span></>}
              </button>
              <button className="button button--quiet" type="button" onClick={handleClear} disabled={loading || (!text && !result)}>Clear</button>
            </div>
            <p className="privacy-note"><span aria-hidden="true">◇</span> Analysis history is stored when MongoDB is configured.</p>
          </form>

          <section className="panel results-panel" aria-live="polite" aria-busy={loading}>
            <div className="panel-heading">
              <div><div className="section-kicker">02 / INSIGHTS</div><h2>Analysis results</h2><p>Your sentiment breakdown and executive summary.</p></div>
              <span className="panel-icon panel-icon--results" aria-hidden="true">◈</span>
            </div>

            {loading ? (
              <div className="result-placeholder"><div className="loading-orbit"><span /></div><h3>Reading the market signals</h3><p>FinBERT is evaluating the financial context of your text.</p></div>
            ) : result ? (
              <div className="results-content">
                <div className={'sentiment-card sentiment-card--' + sentimentClass}>
                  <div><span className="metric-label">DOMINANT SENTIMENT</span><strong>{result.dominant_sentiment}</strong><span className="sentiment-card__caption">Highest predicted sentiment class</span></div>
                  <div className="confidence"><span className="metric-label">CONFIDENCE</span><strong>{result.confidence_score}</strong></div>
                </div>
                <div className="breakdown">
                  <div className="subsection-heading"><h3>Sentiment distribution</h3><span>MODEL PROBABILITIES</span></div>
                  {SENTIMENTS.map((type) => <SentimentBar key={type} type={type} value={result.sentiment_scores && result.sentiment_scores[type]} />)}
                </div>
                <div className="summary-section">
                  <div className="subsection-heading"><h3>Executive summary</h3><button className="copy-button" type="button" onClick={handleCopy}><span aria-hidden="true">{copied ? '✓' : '▢'}</span> {copied ? 'Copied' : 'Copy summary'}</button></div>
                  <div className="summary-box">{result.summary}</div>
                  <div className="summary-footnote"><span>SUMMARY METHOD</span><span>{result.summary_method === 'extractive' ? 'Extractive overview' : 'Summary'}</span></div>
                </div>
                <p className="analysis-disclaimer">AI-generated analysis is informational and is not investment advice.</p>
              </div>
            ) : (
              <div className="result-placeholder result-placeholder--empty">
                <div className="empty-illustration" aria-hidden="true"><span className="empty-illustration__bar empty-illustration__bar--one" /><span className="empty-illustration__bar empty-illustration__bar--two" /><span className="empty-illustration__bar empty-illustration__bar--three" /><span className="empty-illustration__axis" /></div>
                <h3>Insights will appear here</h3><p>Submit a financial article to see its sentiment signals and key takeaways.</p>
              </div>
            )}
          </section>
        </section>
        <footer className="footer"><span>FINAI <span className="footer__dot">•</span> FINANCIAL SENTIMENT ENGINE</span><span>Built for clearer market context.</span></footer>
      </main>
    </div>
  );
}
