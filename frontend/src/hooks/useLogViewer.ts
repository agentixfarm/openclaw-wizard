import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../api/client';
import type { LogLine } from '../types/LogLine';
import type { LogAnalysis } from '../types/LogAnalysis';

const MAX_LINES = 5000;

function levelSeverity(level: string): number {
  switch (level.toLowerCase()) {
    case 'error': return 4;
    case 'warn': case 'warning': return 3;
    case 'info': return 2;
    case 'debug': return 1;
    default: return 0;
  }
}

/**
 * Hook for log streaming via WebSocket, level/search filtering,
 * auto-scroll control, and AI-powered error analysis.
 */
export function useLogViewer() {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [service, setServiceState] = useState<string>('gateway');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [connected, setConnected] = useState(false);
  const [analysis, setAnalysis] = useState<LogAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  // Computed filtered lines
  const filteredLines = useMemo(() => {
    let result = lines;

    // Level filter
    if (levelFilter !== 'all') {
      const minSeverity = levelSeverity(levelFilter);
      result = result.filter(line =>
        line.level
          ? levelSeverity(line.level) >= minSeverity
          : true // Keep lines without a level (continuations)
      );
    }

    // Search filter (case-insensitive)
    if (searchFilter) {
      const query = searchFilter.toLowerCase();
      result = result.filter(line =>
        line.content.toLowerCase().includes(query)
      );
    }

    return result;
  }, [lines, levelFilter, searchFilter]);

  // Fetch recent logs and connect WebSocket
  const connectToService = useCallback(async (svc: string) => {
    // Close existing WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear lines
    setLines([]);
    setConnected(false);

    // Fetch recent logs
    try {
      const recent = await api.getRecentLogs(svc, 200);
      setLines(recent.lines);
    } catch (error) {
      console.error('Failed to fetch recent logs:', error);
    }

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/logs`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ service: svc }));
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log_line') {
          const newLine: LogLine = {
            content: data.content,
            timestamp: data.timestamp || null,
            level: data.level || null,
          };
          setLines(prev => {
            const updated = [...prev, newLine];
            // Circular buffer: keep last MAX_LINES
            if (updated.length > MAX_LINES) {
              return updated.slice(updated.length - MAX_LINES);
            }
            return updated;
          });
        }
      } catch (error) {
        console.error('Failed to parse log message:', error);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setConnected(false);
    };

    wsRef.current = ws;
  }, []);

  // Connect on mount and service change
  useEffect(() => {
    connectToService(service);

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [service, connectToService]);

  const setService = useCallback((svc: string) => {
    setServiceState(svc);
  }, []);

  const clearLogs = useCallback(() => {
    setLines([]);
  }, []);

  const analyzeError = useCallback(async (logContext: string) => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const result = await api.analyzeLogs({
        log_context: logContext,
        service,
      });
      setAnalysis(result);
    } catch (error: unknown) {
      setAnalysisError(error instanceof Error ? error.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  }, [service]);

  const dismissAnalysis = useCallback(() => {
    setAnalysis(null);
    setAnalysisError(null);
  }, []);

  return {
    lines,
    filteredLines,
    service,
    setService,
    levelFilter,
    setLevelFilter,
    searchFilter,
    setSearchFilter,
    autoScroll,
    setAutoScroll,
    connected,
    clearLogs,
    analyzeError,
    analysis,
    analyzing,
    analysisError,
    dismissAnalysis,
  };
}
