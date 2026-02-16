import { useWizard } from '../wizard/WizardProvider';
import { MultiServerSetup } from './MultiServerSetup';
import { DockerSandbox } from './DockerSandbox';

export function TargetsStep() {
  const { powerUserMode } = useWizard();

  if (powerUserMode === 'docker') {
    return <DockerSandbox />;
  }

  return <MultiServerSetup />;
}
