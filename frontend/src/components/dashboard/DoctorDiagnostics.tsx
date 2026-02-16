import { Stethoscope, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import type { DoctorReport } from '../../types/DoctorReport';

interface DoctorDiagnosticsProps {
  report: DoctorReport | null;
  loading: boolean;
  onRun: () => void;
}

/**
 * Doctor diagnostics panel with run button, overall status badge,
 * and check list with pass/fail/warn indicators.
 */
export function DoctorDiagnostics({ report, loading, onRun }: DoctorDiagnosticsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">Diagnostics</h3>
        </div>
        <div className="flex items-center gap-3">
          {report && <OverallStatusBadge status={report.overall_status} />}
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-500 text-white text-sm rounded-md hover:bg-sky-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Stethoscope className="w-3.5 h-3.5" />
            )}
            Run Diagnostics
          </button>
        </div>
      </div>

      {/* Check results */}
      {!report && !loading && (
        <p className="text-sm text-gray-500">
          Click "Run Diagnostics" to check your OpenClaw installation.
        </p>
      )}

      {loading && !report && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running diagnostics...
        </div>
      )}

      {report && (
        <div className="space-y-2">
          {report.checks.map((check, index) => (
            <div key={index} className="border-b border-gray-100 last:border-0 pb-2 last:pb-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusIcon status={check.status} />
                  <span className="text-sm text-gray-700">{check.name}</span>
                </div>
                <StatusBadge status={check.status} />
              </div>
              {check.fix_suggestion && (
                <p className="text-xs text-gray-500 ml-6 mt-1">
                  Fix: {check.fix_suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'pass':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'warn':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'fail':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pass: 'bg-green-100 text-green-700',
    warn: 'bg-yellow-100 text-yellow-700',
    fail: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {labels[status] || status.toUpperCase()}
    </span>
  );
}

function OverallStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };

  const labels: Record<string, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] || 'bg-gray-100 text-gray-600'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}
