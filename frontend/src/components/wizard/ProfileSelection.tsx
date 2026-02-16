import { useState } from 'react';
import { Monitor, Globe, Layers } from 'lucide-react';
import { useWizard } from './WizardProvider';
import type { DeploymentProfile, PowerUserMode } from '../../config/profileSteps';
import clsx from 'clsx';

const PROFILES: {
  id: DeploymentProfile;
  icon: typeof Monitor;
  title: string;
  subtitle: string;
  badge?: string;
}[] = [
  {
    id: 'local',
    icon: Monitor,
    title: 'Local Setup',
    subtitle: 'Install on this machine',
    badge: 'Most Common',
  },
  {
    id: 'remote',
    icon: Globe,
    title: 'Remote Server',
    subtitle: 'Deploy to a VPS via SSH',
    badge: 'Coming Soon',
  },
  {
    id: 'advanced',
    icon: Layers,
    title: 'Advanced',
    subtitle: 'Multi-server or Docker sandbox',
    badge: 'Coming Soon',
  },
];

export function ProfileSelection() {
  const { setProfile } = useWizard();
  const [hoveredProfile, setHoveredProfile] = useState<DeploymentProfile | null>(null);
  const [selectedAdvanced, setSelectedAdvanced] = useState<PowerUserMode>('multi-server');
  const [showAdvancedChoice, setShowAdvancedChoice] = useState(false);

  const handleSelect = (profileId: DeploymentProfile) => {
    if (profileId === 'advanced') {
      setShowAdvancedChoice(true);
      return;
    }
    setProfile(profileId);
  };

  const handleAdvancedConfirm = () => {
    setProfile('advanced', selectedAdvanced);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          How would you like to deploy?
        </h2>
        <p className="mt-3 text-gray-600 dark:text-gray-400">
          Choose your deployment mode. You can always reconfigure later.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PROFILES.map((profile) => {
          const Icon = profile.icon;
          const isHovered = hoveredProfile === profile.id;
          const isAdvancedOpen = profile.id === 'advanced' && showAdvancedChoice;

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => handleSelect(profile.id)}
              onMouseEnter={() => setHoveredProfile(profile.id)}
              onMouseLeave={() => setHoveredProfile(null)}
              className={clsx(
                'relative flex flex-col items-center text-center p-8 rounded-xl border-2 transition-all duration-200 cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-zinc-900',
                {
                  'border-blue-500 bg-blue-50 dark:bg-blue-950/30 shadow-lg scale-[1.02]': isHovered || isAdvancedOpen,
                  'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:shadow-md': !isHovered && !isAdvancedOpen,
                }
              )}
            >
              {profile.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-semibold bg-blue-600 text-white rounded-full whitespace-nowrap">
                  {profile.badge}
                </span>
              )}

              <div className={clsx(
                'w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-colors',
                {
                  'bg-blue-100 dark:bg-blue-900/50': isHovered || isAdvancedOpen,
                  'bg-gray-100 dark:bg-zinc-700': !isHovered && !isAdvancedOpen,
                }
              )}>
                <Icon
                  className={clsx('w-7 h-7 transition-colors', {
                    'text-blue-600 dark:text-blue-400': isHovered || isAdvancedOpen,
                    'text-gray-600 dark:text-gray-400': !isHovered && !isAdvancedOpen,
                  })}
                />
              </div>

              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {profile.title}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {profile.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Advanced sub-choice overlay */}
      {showAdvancedChoice && (
        <div className="mt-6 p-6 bg-white dark:bg-zinc-800 border-2 border-blue-500 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Choose advanced deployment mode
          </h3>
          <div className="space-y-3">
            <label
              className={clsx(
                'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                {
                  'border-blue-500 bg-blue-50 dark:bg-blue-950/30': selectedAdvanced === 'multi-server',
                  'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600': selectedAdvanced !== 'multi-server',
                }
              )}
            >
              <input
                type="radio"
                name="advanced-mode"
                value="multi-server"
                checked={selectedAdvanced === 'multi-server'}
                onChange={() => setSelectedAdvanced('multi-server')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Multi-Server</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Deploy across multiple servers for high availability
                </div>
              </div>
            </label>

            <label
              className={clsx(
                'flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors',
                {
                  'border-blue-500 bg-blue-50 dark:bg-blue-950/30': selectedAdvanced === 'docker',
                  'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600': selectedAdvanced !== 'docker',
                }
              )}
            >
              <input
                type="radio"
                name="advanced-mode"
                value="docker"
                checked={selectedAdvanced === 'docker'}
                onChange={() => setSelectedAdvanced('docker')}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">Docker Sandbox</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Run in an isolated Docker container
                </div>
              </div>
            </label>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleAdvancedConfirm}
              className="px-6 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
            >
              Continue
            </button>
            <button
              type="button"
              onClick={() => setShowAdvancedChoice(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
