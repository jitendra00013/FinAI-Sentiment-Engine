import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the FinAI analysis workspace', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /understand the signal/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/financial news or article/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /analyze market sentiment/i })).toBeDisabled();
});
