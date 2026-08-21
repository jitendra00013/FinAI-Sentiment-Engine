import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = async () => {
    if (!text.trim()) return alert("Please enter financial news text!");
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/process-news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      alert("Error connecting to backend server!");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (result?.summary) {
      navigator.clipboard.writeText(result.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Color Coding Based on Sentiment
  const getSentimentColor = (sentiment) => {
    if (sentiment === 'Positive') return '#10b981'; // Green
    if (sentiment === 'Negative') return '#ef4444'; // Red
    return '#f59e0b'; // Amber / Yellow
  };

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f8fafc', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#38bdf8', marginBottom: '8px' }}>
            📈 FinAI Sentiment & Summarization Engine
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '15px' }}>
            Deep Learning Powered Market Impact & News Analytics
          </p>
        </div>

        {/* Input Card */}
        <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', marginBottom: '30px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#cbd5e1', marginBottom: '10px' }}>
            Paste Financial News / Article:
          </label>
          <textarea
            rows="7"
            style={{ 
              width: '100%', 
              padding: '14px', 
              fontSize: '14px', 
              borderRadius: '8px', 
              backgroundColor: '#0f172a', 
              color: '#f8fafc', 
              border: '1px solid #334155',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box'
            }}
            placeholder="Paste news story, earnings release, or market report here..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          
          <button 
            onClick={handleAnalyze} 
            disabled={loading}
            style={{ 
              marginTop: '15px', 
              width: '100%', 
              padding: '12px', 
              fontSize: '15px', 
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer', 
              backgroundColor: loading ? '#64748b' : '#2563eb', 
              color: '#ffffff', 
              border: 'none', 
              borderRadius: '8px',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {loading ? '⚙️ Running Deep Learning Models...' : '🚀 Analyze Market Impact'}
          </button>
        </div>

        {/* Output Results */}
        {result && (
          <div style={{ backgroundColor: '#1e293b', padding: '24px', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', pb: '15px', paddingBottom: '15px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0 }}>Analysis Output</h2>
              <span style={{ 
                backgroundColor: getSentimentColor(result.dominant_sentiment), 
                color: '#fff', 
                padding: '6px 16px', 
                borderRadius: '20px', 
                fontWeight: '700',
                fontSize: '14px'
              }}>
                {result.dominant_sentiment?.toUpperCase()}
              </span>
            </div>

            {/* Confidence Metric */}
            <div style={{ marginBottom: '20px', backgroundColor: '#0f172a', padding: '15px', borderRadius: '8px', borderLeft: `4px solid ${getSentimentColor(result.dominant_sentiment)}` }}>
              <span style={{ fontSize: '14px', color: '#94a3b8' }}>Model Certainty / Confidence: </span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#f8fafc', marginLeft: '10px' }}>
                {result.confidence_score}
              </span>
            </div>

            {/* Sentiment Breakdown Progress Bars */}
            <div style={{ marginBottom: '25px' }}>
              <h4 style={{ color: '#cbd5e1', marginBottom: '12px' }}>Sentiment Probabilities Breakdown:</h4>
              
              {['positive', 'negative', 'neutral'].map((type) => {
                const score = (result.sentiment_scores?.[type] || 0) * 100;
                const color = type === 'positive' ? '#10b981' : type === 'negative' ? '#ef4444' : '#f59e0b';
                
                return (
                  <div key={type} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize', color: '#94a3b8' }}>{type}</span>
                      <span style={{ fontWeight: '600' }}>{score.toFixed(2)}%</span>
                    </div>
                    <div style={{ width: '100%', backgroundColor: '#334155', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${score}%`, backgroundColor: color, height: '100%', transition: 'width 0.5s ease-in-out' }}></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Box with Copy Button */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ color: '#cbd5e1', margin: 0 }}>Executive Summary:</h4>
                <button 
                  onClick={copyToClipboard}
                  style={{ backgroundColor: '#334155', color: '#f8fafc', border: 'none', padding: '5px 12px', borderRadius: '5px', cursor: 'pointer', fontSize: '12px' }}
                >
                  {copied ? '✅ Copied!' : '📋 Copy Summary'}
                </button>
              </div>
              
              <div style={{ backgroundColor: '#0f172a', padding: '16px', borderRadius: '8px', border: '1px solid #334155', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '14px', color: '#e2e8f0' }}>
                {result.summary}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}