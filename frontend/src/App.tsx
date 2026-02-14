import { WizardProvider, useWizard } from './components/wizard/WizardProvider';
import { Stepper } from './components/wizard/Stepper';
import { WizardStep } from './components/wizard/WizardStep';
import { SystemCheck } from './components/steps/SystemCheck';
import { DetectOpenClaw } from './components/steps/DetectOpenClaw';
import { ProviderConfig } from './components/steps/ProviderConfig';
import { GatewayConfig } from './components/steps/GatewayConfig';
import { ReviewConfig } from './components/steps/ReviewConfig';
import { InstallProgress } from './components/steps/InstallProgress';
import { Complete } from './components/steps/Complete';
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
  const { currentStep } = useWizard();

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
      return <InstallProgress />;
    case 6:
      return <Complete />;
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
