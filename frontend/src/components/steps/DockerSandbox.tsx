import { useState } from 'react';
import {
  AlertTriangle,
  Check,
  Cpu,
  FileText,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  Square,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';
import { useDockerSandbox } from '../../hooks/useDockerSandbox';
import type { ContainerInfo } from '../../types/ContainerInfo';

/**
 * Docker Sandbox wizard step component.
 * Allows users to check Docker availability, create sandbox containers,
 * view running containers, and manage their lifecycle.
 */
export function DockerSandbox() {
  const { nextStep } = useWizard();
  const {
    status,
    containers,
    loading,
    creating,
    error,
    logs,
    logsContainerId,
    dockerAvailable,
    checkDocker,
    createSandbox,
    stopContainer,
    removeContainer,
    viewLogs,
    closeLogs,
  } = useDockerSandbox();
  const [containerName, setContainerName] = useState('openclaw-sandbox');

  // ---------- Rendered States ----------

  // State 1: Loading / Checking Docker
  if (loading) {
    return (
      <WizardStep
        title="Docker Sandbox"
        description="Run OpenClaw in an isolated Docker container"
      >
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
            <p className="text-sm text-zinc-400">
              Checking Docker availability...
            </p>
            <p className="text-xs text-zinc-500">
              Looking for Docker Desktop or Docker Engine
            </p>
          </div>
        </div>
      </WizardStep>
    );
  }

  // State 2: Docker Not Available
  if (status && !status.available) {
    return (
      <WizardStep
        title="Docker Sandbox"
        description="Run OpenClaw in an isolated Docker container"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="border border-amber-700/50 bg-amber-950/30 rounded-lg p-6">
            <div className="flex gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-400 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-zinc-100 mb-2">
                  Docker Not Available
                </h3>
                <p className="text-zinc-300 mb-3">
                  Docker Desktop or Docker Engine is required for sandbox mode.
                  Install Docker to continue, or choose a different setup mode.
                </p>
                {status.error && (
                  <p className="text-sm text-zinc-400 mb-3">
                    Details: {status.error}
                  </p>
                )}
                <a
                  href="https://docs.docker.com/get-docker/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 text-sm"
                >
                  Install Docker <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={checkDocker}
              className="px-4 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 bg-sky-400/60 text-white rounded-md hover:bg-sky-400/80 transition-colors"
            >
              Continue Without Docker
            </button>
          </div>

          <WizardNavigation />
        </div>
      </WizardStep>
    );
  }

  // State 4: Creating container
  if (creating) {
    return (
      <WizardStep
        title="Docker Sandbox"
        description="Run OpenClaw in an isolated Docker container"
      >
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-sky-400 animate-spin" />
              <p className="text-sm text-zinc-300">
                Creating sandbox container...
              </p>
              <p className="text-xs text-zinc-500">
                Setting up isolated environment with security limits
              </p>
            </div>
          </div>

          {/* Security Checklist */}
          <div className="mt-6 space-y-2 max-w-sm mx-auto">
            <SecurityCheckItem label="Memory limit: 512MB" />
            <SecurityCheckItem label="CPU limit: 1 core" />
            <SecurityCheckItem label="Process limit: 100" />
            <SecurityCheckItem label="Capabilities restricted" />
            <SecurityCheckItem label="Non-root user" />
          </div>
        </div>
      </WizardStep>
    );
  }

  // States 3, 5, 6: Docker Available (with or without containers), Error
  return (
    <WizardStep
      title="Docker Sandbox"
      description="Run OpenClaw in an isolated Docker container"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="border border-red-700/50 bg-red-950/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">Error</p>
                <p className="text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button
                type="button"
                onClick={checkDocker}
                className="px-3 py-1 text-xs border border-red-700 text-red-300 rounded hover:bg-red-900/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Docker Available Banner */}
        {dockerAvailable && (
          <div className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-700/50 rounded-lg">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-emerald-300 text-sm font-medium">
              Docker{status?.version ? ` v${status.version}` : ''} detected
            </span>
          </div>
        )}

        {/* Explanation Box (when no containers running) */}
        {containers.length === 0 && (
          <div className="bg-zinc-800 rounded-lg p-6">
            <h3 className="text-zinc-100 font-medium mb-2">
              What is sandbox mode?
            </h3>
            <p className="text-zinc-300 text-sm mb-4">
              Docker sandbox creates an isolated OpenClaw instance with resource
              limits (512MB RAM, 1 CPU). Safe for experimentation -- won't affect
              your host system.
            </p>

            {/* Security Badges */}
            <div className="flex flex-wrap gap-3">
              <SecurityBadge icon={Lock} label="No Docker socket access" />
              <SecurityBadge icon={Shield} label="Non-root user" />
              <SecurityBadge icon={Cpu} label="Resource limits enforced" />
            </div>
          </div>
        )}

        {/* Create Sandbox Form */}
        {containers.length === 0 && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="container-name"
                className="block text-sm font-medium text-zinc-300 mb-1"
              >
                Container Name
              </label>
              <input
                id="container-name"
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                placeholder="my-sandbox"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:ring-sky-400 focus:border-sky-400"
              />
            </div>
            <button
              type="button"
              onClick={() => createSandbox(containerName)}
              disabled={!containerName.trim()}
              className="px-6 py-2 bg-sky-400/60 text-white rounded-md hover:bg-sky-400/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Sandbox
            </button>
          </div>
        )}

        {/* Container Management Panel */}
        {containers.length > 0 && (
          <ContainerManagementPanel
            containers={containers}
            logs={logs}
            logsContainerId={logsContainerId}
            onStop={stopContainer}
            onRemove={removeContainer}
            onViewLogs={viewLogs}
            onCloseLogs={closeLogs}
            onRefresh={() => {}}
            onCreateAnother={() => createSandbox(containerName)}
            canCreateMore={containers.length < 5}
          />
        )}

        <WizardNavigation />
      </div>
    </WizardStep>
  );
}

// ---------- Sub-components ----------

function SecurityCheckItem({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-zinc-300">
      <Check className="w-4 h-4 text-emerald-400" />
      <span>{label}</span>
    </div>
  );
}

function SecurityBadge({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-full text-xs text-zinc-300">
      <Icon className="w-3 h-3 text-emerald-400" />
      {label}
    </span>
  );
}

function ContainerManagementPanel({
  containers,
  logs,
  logsContainerId,
  onStop,
  onRemove,
  onViewLogs,
  onCloseLogs,
  onCreateAnother,
  canCreateMore,
}: {
  containers: ContainerInfo[];
  logs: string[];
  logsContainerId: string | null;
  onStop: (id: string) => void;
  onRemove: (id: string) => void;
  onViewLogs: (id: string) => void;
  onCloseLogs: () => void;
  onRefresh: () => void;
  onCreateAnother: () => void;
  canCreateMore: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-zinc-100 font-medium">Your Containers</h3>
        <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          {containers.length}/5
        </span>
      </div>

      {/* Container limit bar */}
      <div className="w-full bg-zinc-800 rounded-full h-1.5">
        <div
          className="bg-sky-400/60 h-1.5 rounded-full transition-all"
          style={{ width: `${(containers.length / 5) * 100}%` }}
        />
      </div>

      {/* Container rows */}
      <div className="space-y-3">
        {containers.map((container) => (
          <ContainerRow
            key={container.id}
            container={container}
            isLogsOpen={logsContainerId === container.id}
            logs={logsContainerId === container.id ? logs : []}
            onStop={() => onStop(container.id)}
            onRemove={() => onRemove(container.id)}
            onViewLogs={() => onViewLogs(container.id)}
            onCloseLogs={onCloseLogs}
          />
        ))}
      </div>

      {/* Create Another */}
      {canCreateMore && (
        <button
          type="button"
          onClick={onCreateAnother}
          className="px-4 py-2 border border-zinc-600 text-zinc-300 rounded-md hover:bg-zinc-800 transition-colors text-sm"
        >
          Create Another
        </button>
      )}
    </div>
  );
}

function ContainerRow({
  container,
  isLogsOpen,
  logs,
  onStop,
  onRemove,
  onViewLogs,
  onCloseLogs,
}: {
  container: ContainerInfo;
  isLogsOpen: boolean;
  logs: string[];
  onStop: () => void;
  onRemove: () => void;
  onViewLogs: () => void;
  onCloseLogs: () => void;
}) {
  const statusColor =
    container.status === 'Running'
      ? 'bg-emerald-400'
      : container.status === 'Error' || container.status === 'Exited'
        ? 'bg-red-400'
        : 'bg-zinc-400';

  const statusLabel =
    container.status === 'Running'
      ? 'Running'
      : container.status === 'Error'
        ? 'Error'
        : container.status === 'Exited'
          ? 'Exited'
          : 'Stopped';

  const shortId = container.id.slice(0, 12);

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Left: name + status */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor}`}
              aria-label={statusLabel}
            />
            <div className="min-w-0">
              <p className="text-zinc-100 font-medium truncate">
                {container.name}
              </p>
              <p className="text-xs text-zinc-500 font-mono">{shortId}</p>
            </div>
          </div>

          {/* Right: info + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {container.port && (
              <a
                href={`http://localhost:${container.port}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
              >
                localhost:{container.port}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {/* Sandboxed badge */}
            {container.status === 'Running' && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/50 border border-emerald-700/50 rounded-full text-xs text-emerald-300"
                title="This container runs with restricted capabilities: 512MB memory limit, 1 CPU, no root access, no Docker socket access"
              >
                <Lock className="w-3 h-3" />
                Sandboxed
              </span>
            )}

            {/* Action Buttons */}
            <div className="flex gap-1.5">
              {container.status === 'Running' && (
                <button
                  type="button"
                  onClick={onStop}
                  className="p-1.5 text-amber-400 hover:bg-amber-950/30 rounded transition-colors"
                  title="Stop container"
                >
                  <Square className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onViewLogs}
                className="p-1.5 text-zinc-400 hover:bg-zinc-800 rounded transition-colors"
                title="View logs"
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onRemove}
                className="p-1.5 text-red-400 hover:bg-red-950/30 rounded transition-colors"
                title="Remove container"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Container metadata */}
        <div className="mt-2 flex items-center gap-4 text-xs text-zinc-500">
          <span>{container.image}</span>
          <span>{container.created_at}</span>
        </div>
      </div>

      {/* Expandable Logs Section */}
      {isLogsOpen && (
        <div className="border-t border-zinc-700 bg-zinc-950 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400 font-medium">
              Container Logs
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onViewLogs}
                className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
              <button
                type="button"
                onClick={onCloseLogs}
                className="text-xs text-zinc-400 hover:text-zinc-300"
              >
                Close
              </button>
            </div>
          </div>
          <pre className="bg-zinc-800 rounded p-3 text-xs text-zinc-300 font-mono overflow-x-auto max-h-64 overflow-y-auto">
            {logs.length > 0
              ? logs.join('\n')
              : 'No logs available'}
          </pre>
        </div>
      )}
    </div>
  );
}
