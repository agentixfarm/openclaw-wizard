import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Settings, FileText, Package, Lightbulb } from 'lucide-react';
import { AsciiLogo } from '../ui/AsciiLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useServiceManager } from '../../hooks/useServiceManager';
import { useHealthMonitor } from '../../hooks/useHealthMonitor';
import { useConfigAnalyzer } from '../../hooks/useConfigAnalyzer';
import { StatusCard } from './StatusCard';
import { ServiceControls } from './ServiceControls';
import { DoctorDiagnostics } from './DoctorDiagnostics';
import { HealthMonitor } from './HealthMonitor';
import { ConfigEditor } from './ConfigEditor';
import { SkillsBrowser } from '../steps/SkillsBrowser';
import { LogViewer } from './LogViewer';
import { CostOptimizer } from './CostOptimizer';
import { SecurityAuditPanel } from './SecurityAuditPanel';

interface DashboardLayoutProps {
  onBackToWizard: () => void;
}

type Tab = 'overview' | 'config' | 'skills' | 'logs' | 'intelligence';
type IntelSubTab = 'cost' | 'security';

/**
 * Main dashboard layout with tabbed navigation
 */
export function DashboardLayout({ onBackToWizard }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [intelSubTab, setIntelSubTab] = useState<IntelSubTab>('cost');
  const {
    services,
    actionLoading,
    startGateway,
    stopGateway,
    restartGateway,
    startDaemon,
    stopDaemon,
    restartDaemon,
    doctorReport,
    doctorLoading,
    runDoctor,
  } = useServiceManager();
  const { health, refresh: refreshHealth } = useHealthMonitor();
  const {
    costAnalysis,
    securityAudit: securityAuditResult,
    pricing,
    costLoading,
    auditLoading,
    error: intelError,
    analyzeCost,
    runSecurityAudit,
    loadPricing,
  } = useConfigAnalyzer();

  // Auto-load pricing when Cost sub-tab opens
  useEffect(() => {
    if (activeTab === 'intelligence' && intelSubTab === 'cost' && !pricing) {
      loadPricing();
    }
  }, [activeTab, intelSubTab, pricing, loadPricing]);

  // Auto-run security audit when Security sub-tab opens
  useEffect(() => {
    if (activeTab === 'intelligence' && intelSubTab === 'security' && !securityAuditResult) {
      runSecurityAudit();
    }
  }, [activeTab, intelSubTab, securityAuditResult, runSecurityAudit]);

  // Format uptime (accepts bigint from ts-rs u64)
  const formatUptime = (seconds: bigint | number | null | undefined) => {
    if (seconds == null) return 'N/A';
    const numSeconds = Number(seconds);
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Format memory (accepts bigint from ts-rs u64)
  const formatMemory = (mb: bigint | number | null | undefined) => {
    if (mb == null) return 'N/A';
    return `${Number(mb)} MB`;
  };

  // Format CPU
  const formatCpu = (pct: number | null | undefined) => {
    if (pct == null) return 'N/A';
    return `${pct.toFixed(1)}%`;
  };

  // CPU status color
  const cpuStatus = (pct: number | null | undefined): 'ok' | 'warning' | 'error' | 'neutral' => {
    if (pct == null) return 'neutral';
    if (pct > 80) return 'error';
    if (pct > 50) return 'warning';
    return 'ok';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <AsciiLogo label="Dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={onBackToWizard}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Wizard
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Status Cards - Gateway, Daemon, System */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatusCard
            title="Gateway"
            value={services?.gateway?.running ? 'Running' : 'Stopped'}
            status={services?.gateway?.running ? 'ok' : 'neutral'}
            subtitle={
              services?.gateway?.running
                ? `PID: ${services.gateway.pid ?? 'N/A'} | ${formatUptime(services.gateway.uptime_seconds)} | ${formatMemory(services.gateway.memory_mb)}`
                : 'Not running'
            }
          />
          <StatusCard
            title="Daemon"
            value={services?.daemon?.running ? 'Running' : 'Stopped'}
            status={services?.daemon?.running ? 'ok' : 'neutral'}
            subtitle={
              services?.daemon?.running
                ? `PID: ${services.daemon.pid ?? 'N/A'} | ${formatUptime(services.daemon.uptime_seconds)} | ${formatMemory(services.daemon.memory_mb)}`
                : 'Not running'
            }
          />
          <StatusCard
            title="System"
            value={`CPU: ${formatCpu(services?.system_cpu_percent)}`}
            status={cpuStatus(services?.system_cpu_percent)}
            subtitle={
              services
                ? `Memory: ${Number(services.system_memory_used_mb ?? 0)} / ${Number(services.system_memory_total_mb ?? 0)} MB | Errors (24h): ${services.error_count_24h}`
                : 'Loading...'
            }
          />
        </div>

        {/* Service Controls */}
        <div className="mb-6">
          <ServiceControls
            services={services}
            actionLoading={actionLoading}
            onStartGateway={startGateway}
            onStopGateway={stopGateway}
            onRestartGateway={restartGateway}
            onStartDaemon={startDaemon}
            onStopDaemon={stopDaemon}
            onRestartDaemon={restartDaemon}
          />
        </div>

        {/* Doctor Diagnostics */}
        <div className="mb-6">
          <DoctorDiagnostics
            report={doctorReport}
            loading={doctorLoading}
            onRun={runDoctor}
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow border border-gray-200 dark:border-zinc-700">
          <div className="border-b border-gray-200 dark:border-zinc-700">
            <div className="flex gap-1 px-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                <Activity className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'config'
                    ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Config
              </button>
              <button
                onClick={() => setActiveTab('skills')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'skills'
                    ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                <Package className="w-4 h-4" />
                Skills
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'logs'
                    ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Logs
              </button>
              <button
                onClick={() => setActiveTab('intelligence')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'intelligence'
                    ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:border-gray-300'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
                Intelligence
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && <HealthMonitor health={health} daemonRunning={services?.gateway?.running ?? false} onRefresh={refreshHealth} />}
            {activeTab === 'config' && <ConfigEditor />}
            {activeTab === 'skills' && (
              <div className="bg-zinc-900 rounded-lg p-6 -m-6">
                <SkillsBrowser />
              </div>
            )}
            {activeTab === 'logs' && (
              <div className="bg-zinc-900 rounded-lg -m-6 p-0">
                <LogViewer />
              </div>
            )}
            {activeTab === 'intelligence' && (
              <div>
                {/* Sub-tab navigation */}
                <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-zinc-700 pb-3">
                  <button
                    onClick={() => setIntelSubTab('cost')}
                    className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                      intelSubTab === 'cost'
                        ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    Cost Optimization
                  </button>
                  <button
                    onClick={() => setIntelSubTab('security')}
                    className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                      intelSubTab === 'security'
                        ? 'border-blue-600 text-blue-600 dark:border-sky-400 dark:text-sky-400'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white'
                    }`}
                  >
                    Security Audit
                  </button>
                </div>

                {/* Sub-tab content */}
                {intelSubTab === 'cost' && (
                  <CostOptimizer
                    costAnalysis={costAnalysis}
                    pricing={pricing}
                    loading={costLoading}
                    error={intelError}
                    onAnalyze={analyzeCost}
                    onLoadPricing={loadPricing}
                  />
                )}
                {intelSubTab === 'security' && (
                  <SecurityAuditPanel
                    audit={securityAuditResult}
                    loading={auditLoading}
                    error={intelError}
                    onAudit={runSecurityAudit}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
