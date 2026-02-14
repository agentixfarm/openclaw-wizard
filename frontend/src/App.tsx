import { WizardProvider, useWizard } from './components/wizard/WizardProvider';
import { Stepper } from './components/wizard/Stepper';
import { WizardStep } from './components/wizard/WizardStep';
import { WizardNavigation } from './components/wizard/WizardNavigation';
import { SystemCheck } from './components/steps/SystemCheck';
import { DetectOpenClaw } from './components/steps/DetectOpenClaw';
import { ProviderConfig } from './components/steps/ProviderConfig';
import { GatewayConfig } from './components/steps/GatewayConfig';
import { ReviewConfig } from './components/steps/ReviewConfig';
import type { WizardStep as WizardStepType } from './components/wizard/WizardProvider';
import './App.css';

const WIZARD_STEPS: WizardStepType[] = [
  { id: 'system-check', label: 'System Check', description: 'Verify system requirements' },
  { id: 'detect', label: 'Detection', description: 'Find existing installation' },
  { id: 'provider', label: 'AI Provider', description: 'Configure AI model' },
  { id: 'gateway', label: 'Gateway', description: 'Configure gateway settings' },
  { id: 'review', label: 'Review', description: 'Review configuration' },
  { id: 'install', label: 'Install', description: 'Install OpenClaw' },
  { id: 'complete', label: 'Complete', description: 'Setup complete' },
];

function CurrentStepRenderer() {
  const { currentStep, nextStep } = useWizard();

  switch (currentStep) {
    case 0:
      return <SystemCheck />;
    case 1:
      return <DetectOpenClaw />;
    case 2:
      return <ProviderConfig />;
    case 3:
      return <GatewayConfig />;
    case 4:
      return <ReviewConfig />;
    case 5:
      return (
        <WizardStep title="Install OpenClaw" description="Installing and configuring OpenClaw">
          <div className="rounded-md bg-gray-50 p-6 border border-gray-200">
            <p className="text-sm text-gray-600">
              This step will be available soon. The wizard will install OpenClaw and apply your configuration.
            </p>
          </div>
          <WizardNavigation onNext={nextStep} />
        </WizardStep>
      );
    case 6:
      return (
        <WizardStep title="Setup Complete" description="Your OpenClaw installation is ready">
          <div className="rounded-md bg-green-50 p-6 border border-green-200">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Installation Complete!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    OpenClaw has been successfully installed and configured. This completion step will be fully implemented soon.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </WizardStep>
      );
    default:
      return (
        <WizardStep title="Unknown Step">
          <p className="text-sm text-gray-600">Invalid step.</p>
        </WizardStep>
      );
  }
}

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">OpenClaw Setup Wizard</h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <WizardProvider steps={WIZARD_STEPS}>
          {/* Progress stepper */}
          <Stepper steps={WIZARD_STEPS} />

          {/* Current step content */}
          <div className="mt-8">
            <CurrentStepRenderer />
          </div>
        </WizardProvider>
      </main>
    </div>
  );
}

export default App;
