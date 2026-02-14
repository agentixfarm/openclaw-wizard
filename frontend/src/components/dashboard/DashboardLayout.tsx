import { useState } from 'react';
import { ArrowLeft, Activity, Settings, FileText } from 'lucide-react';
import { useDaemonStatus } from '../../hooks/useDaemonStatus';
import { useHealthMonitor } from '../../hooks/useHealthMonitor';
import { StatusCard } from './StatusCard';
import { DaemonControls } from './DaemonControls';
import { HealthMonitor } from './HealthMonitor';
import { ConfigEditor } from './ConfigEditor';

interface DashboardLayoutProps {
  onBackToWizard: () => void;
}

type Tab = 'overview' | 'config' | 'logs';

/**
 * Main dashboard layout with tabbed navigation
 */
export function DashboardLayout({ onBackToWizard }: DashboardLayoutProps) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const { status, actionLoading, start, stop, restart } = useDaemonStatus();
  const { health, refresh: refreshHealth } = useHealthMonitor();

  // Format uptime
  const formatUptime = (seconds: bigint | null) => {
    if (seconds === null) return 'N/A';
    const numSeconds = Number(seconds);
    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // Format memory
  const formatMemory = (mb: bigint | null) => {
    if (mb === null) return 'N/A';
    return `${mb} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">OpenClaw Dashboard</h1>
          <button
            onClick={onBackToWizard}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Wizard
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Gateway Status Card - Always visible */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatusCard
            title="Daemon Status"
            value={status?.running ? 'Running' : 'Stopped'}
            status={status?.running ? 'ok' : 'neutral'}
            subtitle={status?.running ? `PID: ${status.pid || 'N/A'}` : 'Not running'}
          />
          <StatusCard
            title="Uptime"
            value={formatUptime(status?.uptime_seconds ?? null)}
            status="neutral"
          />
          <StatusCard
            title="Memory Usage"
            value={formatMemory(status?.memory_mb ?? null)}
            status="neutral"
          />
        </div>

        {/* Daemon Controls */}
        <div className="mb-6">
          <DaemonControls
            running={status?.running ?? false}
            onStart={start}
            onStop={stop}
            onRestart={restart}
            loading={actionLoading}
          />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="border-b border-gray-200">
            <div className="flex gap-1 px-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Activity className="w-4 h-4" />
                Overview
              </button>
              <button
                onClick={() => setActiveTab('config')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'config'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                Config
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'logs'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                Logs
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && <HealthMonitor health={health} onRefresh={refreshHealth} />}
            {activeTab === 'config' && <ConfigEditor />}
            {activeTab === 'logs' && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Log viewer coming soon</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
