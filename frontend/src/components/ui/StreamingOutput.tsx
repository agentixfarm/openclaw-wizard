import { useEffect, useRef } from 'react';

interface StreamingOutputProps {
  output: string[];
  maxLines?: number;
  stage?: string;
  message?: string;
  progressPct?: number | null;
}

/**
 * Terminal-style streaming output display
 */
export function StreamingOutput({
  output,
  maxLines = 100,
  stage,
  message,
  progressPct,
}: StreamingOutputProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new output
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [output]);

  const displayedOutput = output.slice(-maxLines);
  const hiddenLines = output.length - displayedOutput.length;

  // Stage display labels
  const stageLabel = stage === 'node-install'
    ? 'Installing Node.js'
    : stage === 'openclaw-install'
    ? 'Installing OpenClaw'
    : stage === 'verify'
    ? 'Verifying Installation'
    : stage || '';

  return (
    <div className="space-y-2">
      {/* Progress header */}
      {stage && (
        <div className="flex items-center justify-between text-sm">
          <div className="font-medium text-gray-300">{stageLabel}</div>
          {progressPct !== null && progressPct !== undefined && (
            <div className="text-gray-500">{progressPct}%</div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {progressPct !== null && progressPct !== undefined && (
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* Terminal output */}
      <div
        ref={containerRef}
        className="bg-black text-green-400 font-mono text-xs p-4 rounded-md h-64 overflow-y-auto"
      >
        {hiddenLines > 0 && (
          <div className="text-gray-500 mb-2">
            ... {hiddenLines} earlier lines hidden
          </div>
        )}
        {displayedOutput.length === 0 ? (
          <div className="text-gray-500">
            {message || 'Waiting for output...'}
          </div>
        ) : (
          <>
            {displayedOutput.map((line, index) => (
              <div key={index} className="whitespace-pre-wrap break-words">
                {line}
              </div>
            ))}
            {/* Show current activity as a dimmed status line */}
            {message && (
              <div className="text-gray-600 mt-1 animate-pulse">
                {message}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
