import { useState, useEffect, useCallback } from 'react';
import type { WizardFormData } from '../schemas/wizardSchemas';

const STORAGE_KEY = 'openclaw-wizard-state';

interface WizardState {
  currentStep: number;
  formData: Partial<WizardFormData>;
  completedSteps: Set<number>;
}

interface PersistedState {
  currentStep: number;
  formData: Partial<WizardFormData>;
  completedSteps: number[];
}

/**
 * Hook to manage wizard state with localStorage persistence
 */
export function useWizardState(totalSteps: number) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardFormData>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        setCurrentStep(parsed.currentStep);
        setFormData(parsed.formData);
        setCompletedSteps(new Set(parsed.completedSteps));
      }
    } catch (error) {
      console.error('Failed to load wizard state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  const persistState = useCallback(
    (state: WizardState) => {
      try {
        // Strip API keys from formData before persisting for security
        const sanitizedFormData = { ...state.formData };
        if (sanitizedFormData.providerConfig) {
          sanitizedFormData.providerConfig = {
            ...sanitizedFormData.providerConfig,
            apiKey: '', // Don't store API keys
          };
        }

        const toPersist: PersistedState = {
          currentStep: state.currentStep,
          formData: sanitizedFormData,
          completedSteps: Array.from(state.completedSteps),
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
      } catch (error) {
        console.error('Failed to save wizard state to localStorage:', error);
      }
    },
    []
  );

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const newStep = currentStep + 1;
      const newCompleted = new Set(completedSteps).add(currentStep);

      setCurrentStep(newStep);
      setCompletedSteps(newCompleted);

      persistState({
        currentStep: newStep,
        formData,
        completedSteps: newCompleted,
      });
    }
  }, [currentStep, totalSteps, completedSteps, formData, persistState]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;

      setCurrentStep(newStep);

      persistState({
        currentStep: newStep,
        formData,
        completedSteps,
      });
    }
  }, [currentStep, formData, completedSteps, persistState]);

  // Go to specific step (only if not skipping ahead)
  const goToStep = useCallback(
    (step: number) => {
      const maxAllowedStep = Math.max(...Array.from(completedSteps), -1) + 1;

      if (step >= 0 && step < totalSteps && step <= maxAllowedStep) {
        setCurrentStep(step);

        persistState({
          currentStep: step,
          formData,
          completedSteps,
        });
      }
    },
    [totalSteps, completedSteps, formData, persistState]
  );

  // Update form data for a specific step
  const updateFormData = useCallback(
    (stepKey: keyof WizardFormData, data: any) => {
      const newFormData = {
        ...formData,
        [stepKey]: data,
      };

      setFormData(newFormData);

      persistState({
        currentStep,
        formData: newFormData,
        completedSteps,
      });
    },
    [formData, currentStep, completedSteps, persistState]
  );

  // Reset wizard to initial state
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setFormData({});
    setCompletedSteps(new Set());

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear wizard state from localStorage:', error);
    }
  }, []);

  return {
    currentStep,
    formData,
    completedSteps,
    nextStep,
    prevStep,
    goToStep,
    updateFormData,
    resetWizard,
  };
}
