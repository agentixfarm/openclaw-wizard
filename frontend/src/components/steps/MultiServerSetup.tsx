import { useState, useEffect } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { useMultiServer } from '../../hooks/useMultiServer';
import {
  Server,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Circle,
  Loader2,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { ServerTarget } from '../../types/ServerTarget';

type View = 'list' | 'deploy';

const DEPLOY_STAGES = ['Connect', 'Node', 'OpenClaw', 'Config', 'Daemon'];

/**
 * Multi-Server Setup wizard step.
 *
 * Three views: Server List (pre-deploy), Add Server Modal, Deployment Progress.
 * Allows users to add, test, and deploy to multiple servers simultaneously.
 */
export function MultiServerSetup() {
  const { nextStep } = useWizard();
  const {
    servers,
    deploying,
    progress,
    error,
    loadServers,
    addServer,
    removeServer,
    testServer,
    testAllServers,
    deployToServers,
    rollbackServer,
  } = useMultiServer();

  const [view, setView] = useState<View>('list');
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Form state for Add Server modal
  const [formName, setFormName] = useState('');
  const [formHost, setFormHost] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formKeyPath, setFormKeyPath] = useState('~/.ssh/id_rsa');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const connectedServers = servers.filter(s => s.status === 'connected');
  const deployedServers = servers.filter(s => s.status === 'deployed');
  const failedDeploys = Object.entries(progress).filter(
    ([, p]) => p.status === 'failed'
  );

  const handleAddServer = async () => {
    setFormError(null);

    // Validation
    if (!formName.trim()) { setFormError('Server name is required'); return; }
    if (!formHost.trim()) { setFormError('Hostname is required'); return; }
    if (!/^[a-zA-Z0-9.-]+$/.test(formHost)) { setFormError('Invalid hostname format'); return; }
    if (!formUsername.trim()) { setFormError('Username is required'); return; }
    if (!/^[a-z_][a-z0-9_-]*$/.test(formUsername)) { setFormError('Invalid username format'); return; }

    try {
      const newServer: ServerTarget = {
        id: '',
        name: formName.trim(),
        host: formHost.trim(),
        username: formUsername.trim(),
        key_path: formKeyPath.trim(),
        status: 'pending',
      };

      await addServer(newServer);

      // Auto-test connection
      await loadServers();
      const lastServer = servers[servers.length - 1];
      if (lastServer) {
        setTestingId(lastServer.id);
        await testServer(lastServer.id);
        setTestingId(null);
      }

      // Reset form
      setFormName('');
      setFormHost('');
      setFormUsername('');
      setFormKeyPath('~/.ssh/id_rsa');
      setShowAddModal(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to add server');
    }
  };

  const handleTestServer = async (id: string) => {
    setTestingId(id);
    await testServer(id);
    setTestingId(null);
  };

  const handleDeploy = () => {
    const ids = connectedServers.map(s => s.id);
    if (ids.length === 0) return;
    setView('deploy');
    deployToServers(ids);
  };

  const stageIndex = (stageName: string): number => {
    const stageMap: Record<string, number> = {
      connection: 0,
      node: 1,
      openclaw: 2,
      config: 3,
      daemon: 4,
      complete: 5,
    };
    return stageMap[stageName] ?? -1;
  };

  const statusIcon = (serverStatus: string) => {
    switch (serverStatus) {
      case 'connected':
      case 'deployed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Circle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Server List View
  if (view === 'list') {
    return (
      <WizardStep title="Multi-Server Deployment" description="Deploy OpenClaw to multiple servers simultaneously">
        <div className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Server cards */}
          {servers.length > 0 ? (
            <div className="space-y-3">
              {servers.map(server => (
                <div
                  key={server.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {statusIcon(server.status)}
                    <div>
                      <p className="font-medium text-gray-900">{server.name}</p>
                      <p className="text-sm text-gray-500">
                        {server.username}@{server.host}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      server.status === 'connected' ? 'bg-green-100 text-green-700' :
                      server.status === 'deployed' ? 'bg-blue-100 text-blue-700' :
                      server.status === 'failed' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {server.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTestServer(server.id)}
                      disabled={testingId === server.id}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {testingId === server.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeServer(server.id)}
                      className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Server className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No servers added yet.</p>
              <p className="text-sm">Add a server to get started with multi-server deployment.</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Server
            </button>
            {servers.length > 0 && (
              <button
                onClick={testAllServers}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Test All
              </button>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={nextStep}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Skip - Single Server
            </button>
            <button
              onClick={handleDeploy}
              disabled={connectedServers.length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Deploy to {connectedServers.length} Connected Server{connectedServers.length !== 1 ? 's' : ''}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add Server Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Server</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Server Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="Production Server 1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hostname / IP</label>
                  <input
                    type="text"
                    value={formHost}
                    onChange={e => setFormHost(e.target.value)}
                    placeholder="192.168.1.100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={e => setFormUsername(e.target.value)}
                    placeholder="ubuntu"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SSH Key Path</label>
                  <input
                    type="text"
                    value={formKeyPath}
                    onChange={e => setFormKeyPath(e.target.value)}
                    placeholder="~/.ssh/id_rsa"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 mt-3">{formError}</p>
              )}

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowAddModal(false); setFormError(null); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddServer}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Add & Test
                </button>
              </div>
            </div>
          </div>
        )}
      </WizardStep>
    );
  }

  // Deployment Progress View
  return (
    <WizardStep title="Deploying to Servers" description={`${Object.keys(progress).length} server(s) in progress`}>
      <div className="space-y-6">
        {/* Overall progress */}
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {deploying ? 'Deployment in progress...' : 'Deployment complete'}
          </span>
          <span>
            {deployedServers.length}/{servers.length} servers
          </span>
        </div>

        {/* Per-server progress cards */}
        <div className="space-y-4">
          {servers.filter(s => s.status !== 'pending' || progress[s.id]).map(server => {
            const serverProgress = progress[server.id];
            const currentStageIdx = serverProgress ? stageIndex(serverProgress.stage) : -1;
            const isFailed = serverProgress?.status === 'failed';
            const isComplete = serverProgress?.stage === 'complete';

            return (
              <div key={server.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{server.name}</span>
                    <span className="text-sm text-gray-500">{server.host}</span>
                  </div>
                  {isFailed && (
                    <button
                      onClick={() => rollbackServer(server.id)}
                      className="flex items-center gap-1 px-3 py-1 text-xs text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Rollback
                    </button>
                  )}
                </div>

                {/* 5-stage progress indicator */}
                <div className="flex items-center gap-1 mb-2">
                  {DEPLOY_STAGES.map((stage, idx) => {
                    const isCompleted = currentStageIdx > idx || isComplete;
                    const isCurrent = currentStageIdx === idx && !isFailed && !isComplete;
                    const isFailedStage = currentStageIdx === idx && isFailed;

                    return (
                      <div key={stage} className="flex-1">
                        <div
                          className={`h-2 rounded-full ${
                            isFailedStage ? 'bg-red-500' :
                            isCompleted ? 'bg-green-500' :
                            isCurrent ? 'bg-blue-500 animate-pulse' :
                            'bg-gray-200'
                          }`}
                        />
                        <p className={`text-xs mt-1 text-center ${
                          isFailedStage ? 'text-red-600 font-medium' :
                          isCompleted ? 'text-green-600' :
                          isCurrent ? 'text-blue-600 font-medium' :
                          'text-gray-400'
                        }`}>
                          {stage}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Status message */}
                {serverProgress && (
                  <p className={`text-sm ${isFailed ? 'text-red-600' : 'text-gray-600'}`}>
                    {serverProgress.message}
                  </p>
                )}
                {serverProgress?.error && (
                  <p className="text-xs text-red-500 mt-1">{serverProgress.error}</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Completion actions */}
        {!deploying && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            {failedDeploys.length > 0 ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-red-600">
                  {failedDeploys.length} server(s) failed
                </span>
                <button
                  onClick={() => setView('list')}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Server List
                </button>
              </div>
            ) : (
              <span className="text-sm text-green-600 font-medium">
                All servers deployed successfully
              </span>
            )}
            <button
              onClick={nextStep}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {failedDeploys.length > 0
                ? `Continue with ${deployedServers.length} Server${deployedServers.length !== 1 ? 's' : ''}`
                : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </WizardStep>
  );
}
