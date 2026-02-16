import { createContext, useContext, type ReactNode } from 'react';
import { useWizardState } from '../../hooks/useWizardState';
import { PROFILE_STEPS } from '../../config/profileSteps';
import type { DeploymentProfile, PowerUserMode } from '../../config/profileSteps';
import type { WizardFormData } from '../../schemas/wizardSchemas';

export interface WizardStep {
  id: string;
  label: string;
  description: string;
}

interface WizardContextValue {
  currentStep: number;
  formData: Partial<WizardFormData>;
  completedSteps: Set<number>;
  totalSteps: number;
  steps: WizardStep[];
  deploymentProfile: DeploymentProfile | null;
  powerUserMode: PowerUserMode | null;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateFormData: (stepKey: keyof WizardFormData, data: any) => void;
  resetWizard: () => void;
  setProfile: (profile: DeploymentProfile, mode?: PowerUserMode) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const wizardState = useWizardState();

  const steps = wizardState.deploymentProfile
    ? PROFILE_STEPS[wizardState.deploymentProfile]
    : [];

  const value: WizardContextValue = {
    ...wizardState,
    steps,
  };

  return (
    <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
  );
}

export function useWizard(): WizardContextValue {
  const context = useContext(WizardContext);

  if (!context) {
    throw new Error('useWizard must be used within a WizardProvider');
  }

  return context;
}
