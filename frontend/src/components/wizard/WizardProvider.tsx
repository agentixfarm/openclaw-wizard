import { createContext, useContext, type ReactNode } from 'react';
import { useWizardState } from '../../hooks/useWizardState';
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
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  updateFormData: (stepKey: keyof WizardFormData, data: any) => void;
  resetWizard: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

interface WizardProviderProps {
  children: ReactNode;
  steps: WizardStep[];
}

export function WizardProvider({ children, steps }: WizardProviderProps) {
  const wizardState = useWizardState(steps.length);

  const value: WizardContextValue = {
    ...wizardState,
    totalSteps: steps.length,
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
