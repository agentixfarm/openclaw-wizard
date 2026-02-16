import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { WizardProvider, useWizard } from './components/wizard/WizardProvider';
import { Stepper } from './components/wizard/Stepper';
import { ProfileSelection } from './components/wizard/ProfileSelection';
import { SetupStep } from './components/steps/SetupStep';
import { ConnectStep } from './components/steps/ConnectStep';
import { TargetsStep } from './components/steps/TargetsStep';
import { ConfigureStep } from './components/steps/ConfigureStep';
import { ChannelConfiguration } from './components/steps/ChannelConfiguration';
import { InstallStep } from './components/steps/InstallStep';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { AsciiLogo } from './components/ui/AsciiLogo';
import { ThemeToggle } from './components/ui/ThemeToggle';
import { api } from './api/client';
import './App.css';

type AppMode = 'wizard' | 'dashboard';

function CurrentStepRenderer({ onGoToDashboard }: { onGoToDashboard?: () => void }) {
  const { deploymentProfile, steps, currentStep } = useWizard();

  // No profile selected yet — show profile picker
  if (!deploymentProfile) {
    return <ProfileSelection />;
  }

  const stepId = steps[currentStep]?.id;

  switch (stepId) {
    case 'setup':
      return <SetupStep />;
    case 'connect':
      return <ConnectStep />;
    case 'targets':
      return <TargetsStep />;
    case 'configure':
      return <ConfigureStep />;
    case 'channels':
      return <ChannelConfiguration />;
    case 'install':
      return <InstallStep onGoToDashboard={onGoToDashboard} />;
    default:
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-sm text-gray-600 dark:text-gray-400">Unknown step: {stepId}</p>
        </div>
      );
  }
}

function WizardStepper() {
  const { deploymentProfile, steps } = useWizard();

  // Hide stepper during profile selection or if no steps
  if (!deploymentProfile || steps.length === 0) {
    return null;
  }

  return <Stepper steps={steps} />;
}

function App() {
  const [mode, setMode] = useState<AppMode>('wizard');

  // Check if config exists on mount to determine initial mode
  useEffect(() => {
    const checkConfig = async () => {
      try {
        await api.getConfig();
        // Config exists - clear any wizard state and go to dashboard
        localStorage.removeItem('openclaw-wizard-state');
        setMode('dashboard');
      } catch {
        setMode('wizard');
      }
    };

    checkConfig();
  }, []);

  const goToDashboard = () => {
    // Clear wizard state when transitioning to dashboard
    localStorage.removeItem('openclaw-wizard-state');
    setMode('dashboard');
  };
  const goToWizard = () => setMode('wizard');

  if (mode === 'dashboard') {
    return (
      <>
        <Toaster position="top-right" />
        <DashboardLayout onBackToWizard={goToWizard} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-800 shadow-sm border-b dark:border-zinc-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <AsciiLogo label="Setup Wizard" />
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <WizardProvider>
          {/* Progress stepper (hidden during profile selection) */}
          <WizardStepper />

          {/* Current step content */}
          <div className="mt-8">
            <CurrentStepRenderer onGoToDashboard={goToDashboard} />
          </div>
        </WizardProvider>
      </main>
    </div>
  );
}

export default App;
