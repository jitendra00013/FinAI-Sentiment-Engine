import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => { global.fetch = jest.fn(); });
afterEach(() => { jest.resetAllMocks(); });

test('renders the FinAI analysis workspace', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /understand the story/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/financial news content/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /analyze market sentiment/i })).toBeDisabled();
  expect(screen.getByText(/insights will appear here/i)).toBeInTheDocument();
});

test('submits news and renders sentiment results', async () => {
  global.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      dominant_sentiment: 'Positive',
      confidence_score: '91.20%',
      sentiment_scores: { positive: 0.912, negative: 0.031, neutral: 0.057 },
      summary: 'Revenue increased year over year.',
      summary_method: 'extractive',
    }),
  });

  render(<App />);
  fireEvent.change(screen.getByLabelText(/financial news content/i), {
    target: { value: 'The company reported strong quarterly revenue growth.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /analyze market sentiment/i }));

  expect(await screen.findByText('Positive')).toBeInTheDocument();
  expect(screen.getByText('91.20%')).toBeInTheDocument();
  expect(screen.getByText('Revenue increased year over year.')).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining('/process-news'),
    expect.objectContaining({ method: 'POST' })
  );
});

test('shows a readable API error', async () => {
  global.fetch.mockResolvedValue({
    ok: false,
    status: 503,
    json: async () => ({ detail: 'The FinBERT model is unavailable.' }),
  });

  render(<App />);
  fireEvent.change(screen.getByLabelText(/financial news content/i), {
    target: { value: 'Market update.' },
  });
  fireEvent.click(screen.getByRole('button', { name: /analyze market sentiment/i }));

  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/FinBERT model is unavailable/i));
});
