import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, Settings, FileText, Wrench, Zap, MessageSquare, ExternalLink } from 'lucide-react';
import { AsciiLogo } from '../ui/AsciiLogo';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Tabs } from '../ui/Tabs';
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
import { UninstallPanel } from './UninstallPanel';
import { UpgradePanel } from './UpgradePanel';

interface DashboardLayoutProps {
  onBackToWizard: () => void;
}

type Tab = 'overview' | 'skills' | 'logs' | 'settings' | 'advanced';

/**
 * Main dashboard layout with tabbed navigation
 */
export function DashboardLayout({ onBackToWizard }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const {
    services,
    actionLoading,
    actionError,
    clearError,
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
  const [chatUrl, setChatUrl] = useState<string | null>(null);
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

  // Fetch authenticated chat URL when gateway is running
  useEffect(() => {
    if (!services?.gateway?.running) {
      setChatUrl(null);
      return;
    }
    fetch('/api/dashboard/chat-url')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.url) setChatUrl(data.data.url);
      })
      .catch(() => {});
  }, [services?.gateway?.running]);

  // Auto-load pricing when Advanced tab opens
  useEffect(() => {
    if (activeTab === 'advanced' && !pricing) {
      loadPricing();
    }
  }, [activeTab, pricing, loadPricing]);

  // Auto-run security audit when Advanced tab opens
  useEffect(() => {
    if (activeTab === 'advanced' && !securityAuditResult) {
      runSecurityAudit();
    }
  }, [activeTab, securityAuditResult, runSecurityAudit]);

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
        {/* Tabbed Dashboard */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg shadow border border-gray-200 dark:border-zinc-700">
          <div className="px-4">
            <Tabs
              tabs={[
                { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
                { id: 'skills', label: 'Skills', icon: <Wrench className="w-4 h-4" /> },
                { id: 'logs', label: 'Logs', icon: <FileText className="w-4 h-4" /> },
                { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
                { id: 'advanced', label: 'Advanced', icon: <Zap className="w-4 h-4" /> },
              ]}
              activeTab={activeTab}
              onChange={(tab) => setActiveTab(tab as Tab)}
            />
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* OVERVIEW TAB - Health, Stats, Quick Actions */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

                {/* Service Controls + Chat — side by side (original layout) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ServiceControls
                    services={services}
                    actionLoading={actionLoading}
                    actionError={actionError}
                    onClearError={clearError}
                    onStartGateway={startGateway}
                    onStopGateway={stopGateway}
                    onRestartGateway={restartGateway}
                    onStartDaemon={startDaemon}
                    onStopDaemon={stopDaemon}
                    onRestartDaemon={restartDaemon}
                  />

                  {/* Open Chat card (original blue) */}
                  <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Chat</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          chatUrl
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            chatUrl ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {chatUrl ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {services?.gateway?.running
                        ? 'Your agent is ready. Open the web console to start a conversation.'
                        : 'Start the gateway to enable the web console.'}
                    </p>

                    <a
                      href={chatUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        chatUrl
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 dark:bg-zinc-600 text-gray-500 dark:text-zinc-400 cursor-not-allowed pointer-events-none'
                      }`}
                      onClick={(e) => {
                        if (!chatUrl) e.preventDefault();
                      }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Start talking to your Agent
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Channels Connected */}
                <div className="bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Connected Channels</h3>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {/* TODO: Get actual channel status from backend */}
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-400 text-sm rounded-full">
                      No channels connected
                    </span>
                  </div>

                  {/* Quick WhatsApp Connection */}
                  <button
                    onClick={() => {
                      /* TODO: Implement WhatsApp QR code modal */
                      alert('WhatsApp QR code connection - Coming soon!');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Connect WhatsApp
                  </button>
                </div>

                {/* Health Details */}
                <HealthMonitor
                  health={health}
                  gatewayRunning={services?.gateway?.running ?? false}
                  onRefresh={refreshHealth}
                />
              </div>
            )}

            {/* SKILLS TAB - Skill Installation */}
            {activeTab === 'skills' && (
              <div className="bg-zinc-900 rounded-lg p-6 -m-6">
                <SkillsBrowser />
              </div>
            )}

            {/* LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="bg-zinc-900 rounded-lg -m-6 p-0">
                <LogViewer />
              </div>
            )}

            {/* SETTINGS TAB - Config Editor */}
            {activeTab === 'settings' && <ConfigEditor />}

            {/* ADVANCED TAB - Diagnostics, Updates, Cost, Security, Uninstall */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <DoctorDiagnostics
                  report={doctorReport}
                  loading={doctorLoading}
                  onRun={runDoctor}
                />
                <UpgradePanel />
                <CostOptimizer
                  costAnalysis={costAnalysis}
                  pricing={pricing}
                  loading={costLoading}
                  error={intelError}
                  onAnalyze={analyzeCost}
                  onLoadPricing={loadPricing}
                />
                <SecurityAuditPanel
                  audit={securityAuditResult}
                  loading={auditLoading}
                  error={intelError}
                  onAudit={runSecurityAudit}
                />
                <UninstallPanel />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
