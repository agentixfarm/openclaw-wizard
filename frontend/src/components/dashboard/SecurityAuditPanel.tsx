import { Shield, ShieldCheck, ShieldAlert, AlertTriangle, Info, Loader2 } from 'lucide-react';
import type { SecurityAudit } from '../../types/SecurityAudit';

interface SecurityAuditPanelProps {
  audit: SecurityAudit | null;
  loading: boolean;
  error: string | null;
  onAudit: () => void;
}

/**
 * Security audit UI with findings, severity badges, and fix suggestions.
 * Displays results from 8 rule-based security checks.
 */
export function SecurityAuditPanel({
  audit,
  loading,
  error,
  onAudit,
}: SecurityAuditPanelProps) {
  const severityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 rounded-full">
            <ShieldAlert className="w-3 h-3" />
            Critical
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-yellow-100 text-yellow-800 rounded-full">
            <AlertTriangle className="w-3 h-3" />
            Warning
          </span>
        );
      case 'info':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded-full">
            <Info className="w-3 h-3" />
            Info
          </span>
        );
      default:
        return null;
    }
  };

  const overallScoreBadge = (score: string) => {
    switch (score) {
      case 'secure':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">Secure</span>
          </div>
        );
      case 'warnings':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="font-semibold text-yellow-800">Warnings Found</span>
          </div>
        );
      case 'critical':
        return (
          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <span className="font-semibold text-red-800">Critical Issues</span>
          </div>
        );
      default:
        return null;
    }
  };

  // Group findings by severity
  const criticalFindings = audit?.findings.filter(f => f.severity === 'critical') ?? [];
  const warningFindings = audit?.findings.filter(f => f.severity === 'warning') ?? [];
  const infoFindings = audit?.findings.filter(f => f.severity === 'info') ?? [];
  const orderedFindings = [...criticalFindings, ...warningFindings, ...infoFindings];

  return (
    <div className="space-y-6">
      {/* Header with Audit button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Security Audit</h3>
          <p className="text-sm text-gray-600">
            Rule-based security checks for your OpenClaw configuration.
          </p>
        </div>
        <button
          onClick={onAudit}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Run Audit
            </>
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {audit && (
        <>
          {/* Overall score */}
          <div className="flex items-center justify-between">
            {overallScoreBadge(audit.overall_score)}
            <div className="text-sm text-gray-500">
              {audit.critical_count > 0 && (
                <span className="text-red-600 font-medium">{audit.critical_count} critical</span>
              )}
              {audit.critical_count > 0 && audit.warning_count > 0 && ' / '}
              {audit.warning_count > 0 && (
                <span className="text-yellow-600 font-medium">{audit.warning_count} warning{audit.warning_count !== 1 ? 's' : ''}</span>
              )}
              {audit.critical_count === 0 && audit.warning_count === 0 && (
                <span className="text-green-600 font-medium">All checks passed</span>
              )}
            </div>
          </div>

          {/* All Clear state */}
          {audit.overall_score === 'secure' && (
            <div className="p-8 text-center">
              <ShieldCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">All Clear</h4>
              <p className="text-sm text-gray-600">
                No security issues found in your configuration. All 8 checks passed.
              </p>
            </div>
          )}

          {/* Findings list */}
          {orderedFindings.length > 0 && (
            <div className="space-y-3">
              {orderedFindings.map((finding, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    finding.severity === 'critical'
                      ? 'border-red-200 bg-red-50'
                      : finding.severity === 'warning'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500">{finding.id}</span>
                      {severityBadge(finding.severity)}
                    </div>
                  </div>
                  <h5 className="font-medium text-gray-900 mb-1">{finding.title}</h5>
                  <p className="text-sm text-gray-700 mb-2">{finding.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Affected: <code className="bg-gray-200 px-1 rounded">{finding.affected_field}</code>
                    </span>
                    {finding.fix_suggestion && (
                      <span className="text-xs text-blue-600 font-medium">
                        Fix: {finding.fix_suggestion}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-400">Audit date: {audit.audit_date}</p>
        </>
      )}
    </div>
  );
}
