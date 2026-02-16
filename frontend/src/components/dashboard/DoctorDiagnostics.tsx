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
    <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Diagnostics</h3>
        </div>
        <div className="flex items-center gap-3">
          {report && <OverallStatusBadge status={report.overall_status} />}
          <button
            onClick={onRun}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 bg-sky-500 text-white text-sm rounded-md hover:bg-sky-600 disabled:bg-gray-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors"
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
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Click "Run Diagnostics" to check your OpenClaw installation.
        </p>
      )}

      {loading && !report && (
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Running diagnostics...
        </div>
      )}

      {report && (
        <div className="space-y-3">
          {/* Summary */}
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {getSummaryText(report)}
          </div>

          {/* Issues (only show problems) */}
          {report.checks.filter(c => c.status !== 'pass').length > 0 && (
            <div className="space-y-2">
              {report.checks.filter(c => c.status !== 'pass').map((check, index) => (
                <div key={index} className="border border-gray-200 dark:border-zinc-700 rounded-lg p-3 bg-gray-50 dark:bg-zinc-900">
                  <div className="flex items-start gap-2">
                    <StatusIcon status={check.status} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getFriendlyName(check.name)}
                        </span>
                        <StatusBadge status={check.status} />
                      </div>
                      {check.message && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                          {check.message}
                        </p>
                      )}
                      {check.fix_suggestion && (
                        <div className="text-xs text-blue-600 dark:text-blue-400">
                          💡 {check.fix_suggestion}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All passed */}
          {report.checks.filter(c => c.status !== 'pass').length === 0 && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <CheckCircle className="w-4 h-4" />
              <span>All checks passed! OpenClaw is healthy.</span>
            </div>
          )}
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
    pass: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    warn: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    fail: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  };

  const labels: Record<string, string> = {
    pass: 'PASS',
    warn: 'WARN',
    fail: 'FAIL',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] || 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
      }`}
    >
      {labels[status] || status.toUpperCase()}
    </span>
  );
}

function OverallStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    healthy: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400',
    critical: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  };

  const labels: Record<string, string> = {
    healthy: 'Healthy',
    warning: 'Warning',
    critical: 'Critical',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        styles[status] || 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

/**
 * Translate technical check names to user-friendly descriptions
 */
function getFriendlyName(technicalName: string): string {
  const friendlyNames: Record<string, string> = {
    'State integrity': 'Configuration Files',
    'Security': 'Security Settings',
    'Skills status': 'OpenClaw Features',
    'Plugins': 'Installed Extensions',
    'Gateway': 'Gateway Service',
    'API connectivity': 'API Connection',
    'Permissions': 'File Permissions',
  };

  return friendlyNames[technicalName] || technicalName;
}

/**
 * Generate user-friendly summary from doctor report
 */
function getSummaryText(report: DoctorReport): string {
  const total = report.checks.length;
  const passed = report.checks.filter(c => c.status === 'pass').length;
  const warnings = report.checks.filter(c => c.status === 'warn').length;
  const failed = report.checks.filter(c => c.status === 'fail').length;

  if (failed > 0) {
    return `${failed} critical issue${failed !== 1 ? 's' : ''} found that need${failed === 1 ? 's' : ''} your attention`;
  }
  if (warnings > 0) {
    return `${warnings} warning${warnings !== 1 ? 's' : ''} detected — OpenClaw is working but could be improved`;
  }
  return `All ${total} checks passed successfully`;
}
