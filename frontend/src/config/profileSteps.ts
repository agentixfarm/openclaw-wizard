import type { WizardStep } from '../components/wizard/WizardProvider';

export type DeploymentProfile = 'local' | 'remote' | 'advanced';
export type PowerUserMode = 'multi-server' | 'docker';

export const PROFILE_STEPS: Record<DeploymentProfile, WizardStep[]> = {
  local: [
    { id: 'setup', label: 'Setup', description: 'System check & detection' },
    { id: 'configure', label: 'Configure', description: 'AI provider & network' },
    { id: 'channels', label: 'Channels', description: 'Messaging platforms' },
    { id: 'install', label: 'Install', description: 'Review & install' },
  ],
  remote: [
    { id: 'connect', label: 'Connect', description: 'SSH credentials' },
    { id: 'configure', label: 'Configure', description: 'AI provider & network' },
    { id: 'channels', label: 'Channels', description: 'Messaging platforms' },
    { id: 'install', label: 'Install', description: 'Review & install' },
  ],
  advanced: [
    { id: 'targets', label: 'Targets', description: 'Deployment targets' },
    { id: 'configure', label: 'Configure', description: 'AI provider & network' },
    { id: 'channels', label: 'Channels', description: 'Messaging platforms' },
    { id: 'install', label: 'Install', description: 'Review & install' },
  ],
};
