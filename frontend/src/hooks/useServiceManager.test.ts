import { renderHook, waitFor } from '@testing-library/react';
import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useServiceManager } from './useServiceManager';

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

const server = setupServer(
  http.get('/api/services/status', () => HttpResponse.json(mockServicesStatus)),
  http.post('/api/services/gateway/start', () =>
    HttpResponse.json({
      success: true,
      data: { success: true, service: 'gateway', message: 'Started' },
      error: null,
    })
  ),
  http.post('/api/services/gateway/stop', () =>
    HttpResponse.json({
      success: true,
      data: { success: true, service: 'gateway', message: 'Stopped' },
      error: null,
    })
  ),
  http.get('/api/services/doctor', () =>
    HttpResponse.json({
      success: true,
      data: { checks: [], overall_status: 'healthy', timestamp: '2026-02-16' },
      error: null,
    })
  ),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('useServiceManager', () => {
  test('fetches initial service status', async () => {
    const { result } = renderHook(() => useServiceManager());

    await waitFor(() => {
      expect(result.current.services).not.toBeNull();
    });

    expect(result.current.services?.gateway.running).toBe(true);
    expect(result.current.services?.daemon.running).toBe(false);
  });

  test('has action loading state initially null', () => {
    const { result } = renderHook(() => useServiceManager());
    expect(result.current.actionLoading.gateway).toBeNull();
    expect(result.current.actionLoading.daemon).toBeNull();
  });

  test('has doctor report initially null', () => {
    const { result } = renderHook(() => useServiceManager());
    expect(result.current.doctorReport).toBeNull();
    expect(result.current.doctorLoading).toBe(false);
  });
});
