import { useRef, useEffect, useCallback, useState } from 'react';
import Ansi from 'ansi-to-react';
import { Search, Download, Trash2, Wifi, WifiOff, Sparkles } from 'lucide-react';
import { useLogViewer } from '../../hooks/useLogViewer';
import { LogAnalysisPanel } from './LogAnalysisPanel';

/**
 * Real-time log viewer with ANSI color rendering, filtering,
 * search, auto-scroll, and AI-powered error analysis.
 */
export function LogViewer() {
  const {
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
  } = useLogViewer();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [analysisContext, setAnalysisContext] = useState<string>('');

  // Auto-scroll to bottom when new lines arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);

  // Detect manual scroll to auto-toggle autoScroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setAutoScroll(isNearBottom);
  }, [setAutoScroll]);

  // Handle "Analyze Error" click
  const handleAnalyzeError = useCallback((lineIndex: number) => {
    const start = Math.max(0, lineIndex - 25);
    const end = Math.min(filteredLines.length, lineIndex + 25);
    const context = filteredLines
      .slice(start, end)
      .map(l => l.content)
      .join('\n');
    setAnalysisContext(context);
    analyzeError(context);
  }, [filteredLines, analyzeError]);

  // Download logs as file
  const handleDownload = useCallback(() => {
    const content = filteredLines.map(l => l.content).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `openclaw-${service}-${timestamp}.log`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLines, service]);

  // Line level class
  const lineClass = (level: string | null) => {
    switch (level?.toLowerCase()) {
      case 'error':
        return 'border-l-2 border-red-500 bg-red-950/30 pl-2';
      case 'warn':
      case 'warning':
        return 'border-l-2 border-yellow-500 pl-2';
      case 'debug':
        return 'text-gray-500';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="bg-zinc-900 rounded-lg">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-zinc-800">
        {/* Service toggle */}
        <div className="flex rounded-md overflow-hidden border border-zinc-700">
          <button
            onClick={() => setService('gateway')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              service === 'gateway'
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Gateway
          </button>
          <button
            onClick={() => setService('daemon')}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              service === 'daemon'
                ? 'bg-sky-600 text-white'
                : 'bg-zinc-800 text-gray-400 hover:text-white'
            }`}
          >
            Daemon
          </button>
        </div>

        {/* Level filter */}
        <select
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value)}
          className="bg-zinc-800 text-gray-300 text-sm rounded-md border border-zinc-700 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          <option value="all">All Levels</option>
          <option value="error">Error</option>
          <option value="warn">Warn</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>

        {/* Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search logs..."
            className="w-full bg-zinc-800 text-gray-300 text-sm rounded-md border border-zinc-700 pl-8 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-sky-500 placeholder:text-gray-600"
          />
        </div>

        {/* Auto-scroll toggle */}
        <label className="flex items-center gap-1.5 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded border-zinc-600 bg-zinc-800 text-sky-500 focus:ring-sky-500"
          />
          Auto-scroll
        </label>

        {/* Action buttons */}
        <button
          onClick={clearLogs}
          className="p-1.5 text-gray-500 hover:text-gray-300 rounded transition-colors"
          title="Clear logs"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <button
          onClick={handleDownload}
          className="p-1.5 text-gray-500 hover:text-gray-300 rounded transition-colors"
          title="Download logs"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5 ml-auto">
          {connected ? (
            <>
              <Wifi className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-green-500">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5 text-yellow-500" />
              <span className="text-xs text-yellow-500">Disconnected</span>
            </>
          )}
        </div>
      </div>

      {/* Log output area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-auto font-mono text-sm"
        style={{ minHeight: '400px', maxHeight: 'calc(100vh - 300px)' }}
      >
        {filteredLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <p className="text-base mb-1">No log output</p>
            <p className="text-xs">Service may not be running or no logs available.</p>
          </div>
        ) : (
          <div className="p-2">
            {filteredLines.map((line, index) => (
              <div
                key={index}
                className={`relative py-0.5 px-2 rounded-sm group ${lineClass(line.level)}`}
                onMouseEnter={() => setHoveredLine(index)}
                onMouseLeave={() => setHoveredLine(null)}
              >
                <Ansi>{line.content}</Ansi>
                {/* Analyze Error button on hover for error lines */}
                {line.level === 'error' && hoveredLine === index && (
                  <button
                    onClick={() => handleAnalyzeError(index)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 bg-amber-700 text-amber-100 text-xs rounded hover:bg-amber-600 transition-colors"
                  >
                    <Sparkles className="w-3 h-3" />
                    Analyze Error
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-800 text-xs text-gray-500">
        <span>Showing {filteredLines.length} lines</span>
        <span>
          {levelFilter !== 'all' && `Level: ${levelFilter}`}
          {searchFilter && ` | Search: "${searchFilter}"`}
        </span>
      </div>

      {/* Analysis panel (slide-over) */}
      {(analysis || analyzing || analysisError) && (
        <LogAnalysisPanel
          analysis={analysis}
          analyzing={analyzing}
          error={analysisError}
          logContext={analysisContext}
          onDismiss={dismissAnalysis}
        />
      )}
    </div>
  );
}
