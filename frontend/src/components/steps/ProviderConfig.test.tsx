import { render, screen } from '@testing-library/react';
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { ConfigureStep } from './ConfigureStep';
import { WizardProvider } from '../wizard/WizardProvider';

const server = setupServer(
  http.post('/api/wizard/validate-key', async ({ request }) => {
    const body = await request.json() as { api_key: string };
    const key = (body as { api_key: string }).api_key;
    if (key === 'valid-key') {
      return HttpResponse.json({
        success: true,
        data: { valid: true, error: null },
        error: null,
      });
    }
    return HttpResponse.json({
      success: true,
      data: { valid: false, error: 'Invalid API key' },
      error: null,
    });
  }),
  http.get('/api/dashboard/config', () =>
    HttpResponse.json({ success: false, data: null, error: 'Not found' }, { status: 404 })
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderConfigureStep() {
  return render(
    <WizardProvider>
      <ConfigureStep />
    </WizardProvider>
  );
}

describe('ConfigureStep (formerly ProviderConfig)', () => {
  test('renders configure step with AI Provider section', () => {
    renderConfigureStep();
    expect(screen.getAllByText('AI Provider').length).toBeGreaterThan(0);
  });

  test('shows Anthropic and OpenAI options', () => {
    renderConfigureStep();
    const anthropicElements = screen.getAllByText(/Anthropic/);
    expect(anthropicElements.length).toBeGreaterThan(0);
    const openaiElements = screen.getAllByText(/OpenAI/);
    expect(openaiElements.length).toBeGreaterThan(0);
  });

  test('shows API key input field', () => {
    renderConfigureStep();
    const keyInput = screen.getByPlaceholderText(/sk-ant/);
    expect(keyInput).toBeInTheDocument();
  });

  test('shows validate button', () => {
    renderConfigureStep();
    expect(screen.getByText(/Validate & Continue/)).toBeInTheDocument();
  });

  test('shows collapsed Network and Advanced sections', () => {
    renderConfigureStep();
    expect(screen.getByText('Network')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });
});
