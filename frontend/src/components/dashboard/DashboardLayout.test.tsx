import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { DashboardLayout } from './DashboardLayout';
import { ThemeProvider } from '../ui/ThemeProvider';

const mockServicesStatus = {
  success: true,
  data: {
    gateway: { running: true, pid: 12345, uptime_seconds: 3600, memory_mb: 128, cpu_percent: 5.0 },
    daemon: { running: false, pid: null, uptime_seconds: null, memory_mb: null, cpu_percent: null },
    error_count_24h: 0,
    system_cpu_percent: 15.0,
    system_memory_total_mb: 16384,
    system_memory_used_mb: 8192,
  },
  error: null,
};

const mockHealth = {
  success: true,
  data: {
    status: 'ok',
    uptime_seconds: 3600,
    gateway_reachable: true,
    channels: [],
    daemon_running: true,
    error_count: 0,
    last_error: null,
    timestamp: new Date().toISOString(),
  },
  error: null,
};

const server = setupServer(
  http.get('/api/services/status', () => HttpResponse.json(mockServicesStatus)),
  http.get('/api/dashboard/health', () => HttpResponse.json(mockHealth)),
  http.get('/api/intelligence/pricing', () =>
    HttpResponse.json({ success: true, data: { models: [], last_updated: '2026-02-16' }, error: null })
  ),
  http.get('/api/intelligence/security-audit', () =>
    HttpResponse.json({
      success: true,
      data: { findings: [], overall_score: 'secure', critical_count: 0, warning_count: 0, audit_date: '2026-02-16' },
      error: null,
    })
  ),
  http.get('/api/dashboard/config', () =>
    HttpResponse.json({ success: true, data: { gateway: { port: 18789 } }, error: null })
  ),
  http.get('/api/dashboard/chat-url', () =>
    HttpResponse.json({ success: true, data: { url: 'http://127.0.0.1:18789/#token=test' }, error: null })
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDashboard() {
  return render(
    <ThemeProvider>
      <DashboardLayout onBackToWizard={() => {}} />
    </ThemeProvider>
  );
}

describe('DashboardLayout', () => {
  test('renders dashboard branding', () => {
    renderDashboard();
    expect(screen.getByText('OpenClaw')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  test('shows tab navigation', () => {
    renderDashboard();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Logs')).toBeInTheDocument();
    expect(screen.getByText('Cost Optimization')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  test('renders status cards with service names', async () => {
    renderDashboard();
    // Gateway appears in status card + service controls
    await waitFor(() => {
      expect(screen.getAllByText(/Gateway/i).length).toBeGreaterThan(0);
    });
    expect(screen.getByText('System')).toBeInTheDocument();
  });

  test('shows back to wizard button', () => {
    renderDashboard();
    expect(screen.getByText('Back to Wizard')).toBeInTheDocument();
  });

  test('switches tabs on click', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const costTab = screen.getByText('Cost Optimization');
    await user.click(costTab);

    // Cost Optimization tab should show the model configuration section
    await waitFor(() => {
      expect(screen.getByText('Model Configuration')).toBeInTheDocument();
    });
    expect(screen.getByText('Heartbeat Settings')).toBeInTheDocument();
  });
});
