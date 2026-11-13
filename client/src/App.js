import React, { useMemo, useState } from 'react';
import './App.css';

const API_BASE_URL = (process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const SENTIMENTS = ['positive', 'negative', 'neutral'];
const MAX_CHARACTERS = 20000;

function getSentimentColor(sentiment) {
  if (sentiment === 'Positive') return 'positive';
  if (sentiment === 'Negative') return 'negative';
  return 'neutral';
}

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const wordCount = useMemo(() => text.trim() ? text.trim().split(/\s+/).length : 0, [text]);
  const characterCount = text.length;

  async function handleAnalyze(event) {
    event.preventDefault();
    if (!text.trim()) {
      setError('Paste a financial news article before starting the analysis.');
      return;
    }
    if (text.length > MAX_CHARACTERS) {
      setError(`Please keep the article under ${MAX_CHARACTERS.toLocaleString()} characters.`);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    setResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/process-news`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.detail || `Analysis failed (HTTP ${response.status}).`);
      }
      if (!data.dominant_sentiment || !data.sentiment_scores || !data.summary) {
        throw new Error('The analysis service returned an incomplete response. Please try again.');
      }
      setResult(data);
    } catch (err) {
      setError(err.message || 'Unable to connect to the analysis service. Check that the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  async function copySummary() {
    if (!result?.summary) return;
    try {
      await navigator.clipboard.writeText(result.summary);
      setNotice('Summary copied to clipboard.');
    } catch {
      setError('Clipboard access was blocked by your browser. Select the summary and copy it manually.');
    }
  }

  function resetAnalysis() {
    setText('');
    setResult(null);
    setError('');
    setNotice('');
  }

  const sentimentTone = result ? getSentimentColor(result.dominant_sentiment) : 'neutral';

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <div className="app-container">
        <header className="topbar">
          <a className="brand" href="/" aria-label="FinAI home">
            <span className="brand-mark" aria-hidden="true">F</span>
            <span>Fin<span className="brand-accent">AI</span></span>
          </a>
          <div className="topbar-meta"><span className="status-dot" /> AI-POWERED MARKET INTELLIGENCE</div>
        </header>

        <section className="hero">
          <p className="eyebrow">FINANCIAL NEWS ANALYTICS</p>
          <h1>Understand the signal.<br /><span>Beyond the headlines.</span></h1>
          <p className="hero-copy">Turn complex financial news into clear sentiment signals and concise executive takeaways, powered by FinBERT.</p>
        </section>

        <section className="workspace" aria-label="Financial news analysis workspace">
          <form className="input-card panel" onSubmit={handleAnalyze}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">01 / INPUT</p>
                <h2>Analyze a news story</h2>
              </div>
              <span className="model-chip"><span className="status-dot" /> FINBERT MODEL</span>
            </div>
            <label htmlFor="news-input" className="field-label">Financial news or article</label>
            <textarea
              id="news-input"
              rows="9"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Paste an earnings report, market update, company announcement, or financial article…"
              maxLength={MAX_CHARACTERS}
              aria-describedby="input-help input-count"
              disabled={loading}
            />
            <div className="input-footer">
              <span id="input-help">For best results, include the key financial context and company details.</span>
              <span id="input-count" className={characterCount > MAX_CHARACTERS * 0.9 ? 'count warning' : 'count'}>{characterCount.toLocaleString()} / {MAX_CHARACTERS.toLocaleString()}</span>
            </div>
            {error && <div className="alert error-alert" role="alert"><span aria-hidden="true">!</span>{error}</div>}
            {notice && <div className="alert success-alert" role="status">{notice}</div>}
            <div className="form-actions">
              <button className="primary-button" type="submit" disabled={loading || !text.trim()}>
                {loading ? <><span className="spinner" aria-hidden="true" /> Analyzing article…</> : <>Analyze market sentiment <span aria-hidden="true">↗</span></>}
              </button>
              <button className="text-button" type="button" onClick={resetAnalysis} disabled={loading || (!text && !result)}>Clear</button>
              <span className="word-count">{wordCount.toLocaleString()} words</span>
            </div>
          </form>

          <section className="results-card panel" aria-live="polite" aria-busy={loading}>
            <div className="section-heading results-heading">
              <div>
                <p className="eyebrow">02 / INSIGHT</p>
                <h2>Analysis overview</h2>
              </div>
              {result && <span className={`sentiment-badge ${sentimentTone}`}>{result.dominant_sentiment}</span>}
            </div>

            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-icon" aria-hidden="true">↗</div>
                <h3>Your insights will appear here</h3>
                <p>Submit a financial news article to see its sentiment classification, model confidence, and executive summary.</p>
              </div>
            )}

            {loading && (
              <div className="loading-state">
                <span className="large-spinner" aria-hidden="true" />
                <h3>Reading between the lines</h3>
                <p>FinBERT is evaluating the financial language in your article.</p>
              </div>
            )}

            {result && (
              <div className="result-content">
                <div className={`confidence-card ${sentimentTone}`}>
                  <div><span className="metric-label">MODEL CONFIDENCE</span><strong>{result.confidence_score}</strong></div>
                  <span className="confidence-caption">Highest predicted sentiment probability</span>
                </div>
                <div className="breakdown">
                  <div className="subsection-heading"><h3>Sentiment distribution</h3><span>Probability</span></div>
                  {SENTIMENTS.map((type) => {
                    const score = Math.max(0, Math.min(1, Number(result.sentiment_scores?.[type] || 0)));
                    return (
                      <div className="score-row" key={type}>
                        <div className="score-label"><span className={`legend-dot ${type}`} /> <span>{type}</span><strong>{(score * 100).toFixed(2)}%</strong></div>
                        <div className="progress-track" role="progressbar" aria-label={`${type} sentiment probability`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Number((score * 100).toFixed(2))}>
                          <div className={`progress-fill ${type}`} style={{ width: `${score * 100}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="summary-section">
                  <div className="subsection-heading"><h3>Executive summary</h3><button type="button" className="copy-button" onClick={copySummary}>Copy summary</button></div>
                  <div className="summary-text">{result.summary}</div>
                </div>
                <p className="disclaimer">AI-generated analysis for informational purposes only. This is not investment advice.</p>
              </div>
            )}
          </section>
        </section>

        <footer className="footer"><span>FinAI Sentiment Engine</span><span>Financial language intelligence, simplified.</span></footer>
      </div>
    </main>
  );
}
