import { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  ShieldQuestion,
  Globe,
  FolderOpen,
  Pencil,
  Terminal,
  Container,
  ExternalLink,
  Loader2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
} from 'lucide-react';
import type { SkillMetadata } from '../../types/SkillMetadata';
import type { ScanResult } from '../../types/ScanResult';

interface SkillDetailProps {
  skill: SkillMetadata;
  onClose: () => void;
  onInstall: (name: string, version?: string) => void;
  onUninstall: (name: string) => void;
  isInstalled: boolean;
  installing: boolean;
  scanResult: ScanResult | null;
  onScan: (name: string, version: string) => void;
}

const CAPABILITY_CONFIG: Record<string, { icon: typeof Globe; label: string; warning?: boolean }> = {
  network_access: { icon: Globe, label: 'Network Access' },
  network: { icon: Globe, label: 'Network Access' },
  filesystem_read: { icon: FolderOpen, label: 'Read Files' },
  filesystem_write: { icon: Pencil, label: 'Write Files' },
  filesystem: { icon: FolderOpen, label: 'File System Access' },
  process_spawn: { icon: Terminal, label: 'Run Processes' },
  docker_access: { icon: Container, label: 'Docker Access', warning: true },
  docker: { icon: Container, label: 'Docker Access', warning: true },
};

/**
 * VirusTotal scan results display section.
 * Shows 4 states: clean, suspicious, malicious, not-configured, or not-yet-scanned.
 */
function VirusTotalSection({
  scanResult,
  onScan,
  isScanning,
}: {
  scanResult: ScanResult | null;
  onScan: () => void;
  isScanning: boolean;
}) {
  if (isScanning) {
    return (
      <div className="border border-zinc-700 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
          <div>
            <p className="text-zinc-200 text-sm font-medium">Scanning for threats...</p>
            <p className="text-zinc-500 text-xs mt-0.5">Checking with VirusTotal antivirus engines</p>
          </div>
        </div>
      </div>
    );
  }

  if (scanResult) {
    const { threat_level, malicious_count, suspicious_count, total_scanners, scan_date, permalink } = scanResult;

    if (threat_level === 'Clean') {
      return (
        <div className="border border-emerald-400/30 bg-emerald-400/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-emerald-400 font-medium text-sm">No threats detected</p>
              <p className="text-zinc-400 text-xs mt-1">
                0/{total_scanners} scanners flagged this skill
              </p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Scanned: {new Date(scan_date).toLocaleDateString()}
              </p>
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2 transition-colors"
                >
                  View Full Report <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (threat_level === 'Suspicious') {
      return (
        <div className="border border-amber-400/30 bg-amber-400/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-amber-400 font-medium text-sm">Caution: Suspicious detections</p>
              <p className="text-zinc-400 text-xs mt-1">
                {malicious_count} malicious / {suspicious_count} suspicious / {total_scanners} total scanners
              </p>
              <p className="text-zinc-400 text-xs mt-0.5">Review before installing.</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Scanned: {new Date(scan_date).toLocaleDateString()}
              </p>
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2 transition-colors"
                >
                  View Full Report <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (threat_level === 'Malicious') {
      return (
        <div className="border border-red-400/30 bg-red-400/5 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ShieldX className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium text-sm">BLOCKED: Malware detected</p>
              <p className="text-zinc-400 text-xs mt-1">
                {malicious_count} malicious / {suspicious_count} suspicious / {total_scanners} total scanners
              </p>
              <p className="text-red-400/70 text-xs mt-0.5">This skill cannot be installed.</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                Scanned: {new Date(scan_date).toLocaleDateString()}
              </p>
              {permalink && (
                <a
                  href={permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2 transition-colors"
                >
                  View Full Report <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      );
    }
  }

  // No scan result -- show scan button or not-configured message
  return (
    <div className="border border-zinc-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <ShieldQuestion className="w-5 h-5 text-zinc-500 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-zinc-400 text-sm font-medium">Not yet scanned</p>
          <p className="text-zinc-500 text-xs mt-0.5">
            Scan will run automatically before installation.
          </p>
          <button
            onClick={onScan}
            className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded mt-2 transition-colors"
          >
            Scan Now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Skill detail view shown as a slide-over panel from the right edge.
 * Displays full metadata, capabilities, VT scan results, and install/uninstall actions.
 */
export function SkillDetail({
  skill,
  onClose,
  onInstall,
  onUninstall,
  isInstalled,
  installing,
  scanResult,
  onScan,
}: SkillDetailProps) {
  const [scanning, setScanning] = useState(false);
  const [showSuspiciousConfirm, setShowSuspiciousConfirm] = useState(false);

  const isMalicious = scanResult?.threat_level === 'Malicious';
  const isSuspicious = scanResult?.threat_level === 'Suspicious';

  const handleScan = async () => {
    setScanning(true);
    onScan(skill.name, skill.version);
    // Let the parent hook manage the state; we just track local scanning UI
    setTimeout(() => setScanning(false), 3000);
  };

  const handleInstall = () => {
    if (isMalicious) return;
    if (isSuspicious) {
      setShowSuspiciousConfirm(true);
      return;
    }
    onInstall(skill.name, skill.version);
  };

  const confirmSuspiciousInstall = () => {
    setShowSuspiciousConfirm(false);
    onInstall(skill.name, skill.version);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Slide-over panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-zinc-900 border-l border-zinc-700 z-50 overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-zinc-100">{skill.name}</h2>
              <span className="text-xs bg-zinc-700 text-zinc-300 rounded px-2 py-0.5">
                v{skill.version}
              </span>
            </div>
            {skill.author && (
              <p className="text-zinc-400 text-sm">
                by{' '}
                {skill.homepage ? (
                  <a
                    href={skill.homepage}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    {skill.author}
                  </a>
                ) : (
                  skill.author
                )}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <p className="text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
              {skill.description}
            </p>
          </div>

          {/* Capabilities */}
          <div>
            <h3 className="text-sm font-medium text-zinc-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Required Capabilities
            </h3>
            {skill.capabilities.length === 0 ? (
              <p className="text-emerald-400 text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                This skill requires no special permissions
              </p>
            ) : (
              <div className="space-y-2">
                {skill.capabilities.map(cap => {
                  const config = CAPABILITY_CONFIG[cap] || { icon: Info, label: cap };
                  const Icon = config.icon;
                  return (
                    <div
                      key={cap}
                      className={`flex items-center gap-2.5 text-sm ${
                        config.warning ? 'text-amber-400' : 'text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{config.label}</span>
                      {config.warning && (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tags */}
          {skill.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-zinc-200 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {skill.tags.map(tag => (
                  <span key={tag} className="text-xs bg-zinc-800 text-zinc-400 rounded px-2 py-0.5">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          <div className="flex flex-wrap gap-4">
            {skill.repository && (
              <a
                href={skill.repository}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Source Code
              </a>
            )}
            {skill.homepage && (
              <a
                href={skill.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                Homepage
              </a>
            )}
          </div>

          {/* VirusTotal Security Scan */}
          <div>
            <h3 className="text-sm font-medium text-zinc-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security Scan
            </h3>
            <VirusTotalSection
              scanResult={scanResult}
              onScan={handleScan}
              isScanning={scanning}
            />
          </div>

          {/* Install / Uninstall action */}
          <div className="pt-4 border-t border-zinc-700">
            {isInstalled ? (
              <button
                onClick={() => onUninstall(skill.name)}
                className="w-full text-sm border border-red-400/30 text-red-400 hover:bg-red-400/10 hover:border-red-400/50 px-4 py-3 rounded-lg transition-colors font-medium"
              >
                Uninstall {skill.name}
              </button>
            ) : isMalicious ? (
              <div>
                <button
                  disabled
                  className="w-full text-sm bg-zinc-800 text-zinc-500 px-4 py-3 rounded-lg cursor-not-allowed font-medium"
                  title="Blocked: malware detected"
                >
                  <span className="flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4" />
                    Blocked by security scan
                  </span>
                </button>
              </div>
            ) : installing ? (
              <button
                disabled
                className="w-full text-sm bg-sky-400/40 text-white px-4 py-3 rounded-lg cursor-wait font-medium"
              >
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Installing...
                </span>
              </button>
            ) : (
              <button
                onClick={handleInstall}
                className={`w-full text-sm px-4 py-3 rounded-lg font-medium transition-colors ${
                  isSuspicious
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-sky-400/60 hover:bg-sky-400/80 text-white'
                }`}
              >
                Install {skill.name}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Suspicious confirmation dialog */}
      {showSuspiciousConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-60 p-4" style={{ zIndex: 60 }}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Suspicious Detections</h3>
                <p className="text-zinc-400 text-sm mt-2">
                  {scanResult?.suspicious_count} scanners flagged potential issues with this skill.
                </p>
                <div className="text-zinc-500 text-xs mt-2 space-y-0.5">
                  <p>{scanResult?.suspicious_count ?? 0} suspicious</p>
                  <p>{scanResult?.malicious_count ?? 0} malicious</p>
                  <p>{scanResult?.total_scanners ?? 0} total scanners</p>
                </div>
                {scanResult?.permalink && (
                  <a
                    href={scanResult.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2 transition-colors"
                  >
                    View Report <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowSuspiciousConfirm(false)}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded border border-zinc-700 hover:border-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmSuspiciousInstall}
                className="text-sm bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded transition-colors"
              >
                Install Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
