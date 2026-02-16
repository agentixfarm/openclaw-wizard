import { useState, useEffect, useCallback } from 'react';
import type { WizardFormData } from '../schemas/wizardSchemas';
import { PROFILE_STEPS } from '../config/profileSteps';
import type { DeploymentProfile, PowerUserMode } from '../config/profileSteps';

const STORAGE_KEY = 'openclaw-wizard-state';

interface WizardState {
  currentStep: number;
  formData: Partial<WizardFormData>;
  completedSteps: Set<number>;
  deploymentProfile: DeploymentProfile | null;
  powerUserMode: PowerUserMode | null;
}

interface PersistedState {
  currentStep: number;
  formData: Partial<WizardFormData>;
  completedSteps: number[];
  deploymentProfile: DeploymentProfile | null;
  powerUserMode: PowerUserMode | null;
}

/**
 * Hook to manage wizard state with localStorage persistence
 */
export function useWizardState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<WizardFormData>>({});
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [deploymentProfile, setDeploymentProfile] = useState<DeploymentProfile | null>(null);
  const [powerUserMode, setPowerUserMode] = useState<PowerUserMode | null>(null);

  const totalSteps = deploymentProfile ? PROFILE_STEPS[deploymentProfile].length : 0;

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PersistedState = JSON.parse(stored);
        // If old state has no deploymentProfile, reset to fresh
        if (!parsed.deploymentProfile) {
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        setCurrentStep(parsed.currentStep);
        setFormData(parsed.formData);
        setCompletedSteps(new Set(parsed.completedSteps));
        setDeploymentProfile(parsed.deploymentProfile);
        setPowerUserMode(parsed.powerUserMode);
      }
    } catch (error) {
      console.error('Failed to load wizard state from localStorage:', error);
    }
  }, []);

  // Save state to localStorage whenever it changes
  const persistState = useCallback(
    (state: WizardState) => {
      try {
        const toPersist: PersistedState = {
          currentStep: state.currentStep,
          formData: state.formData,
          completedSteps: Array.from(state.completedSteps),
          deploymentProfile: state.deploymentProfile,
          powerUserMode: state.powerUserMode,
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist));
      } catch (error) {
        console.error('Failed to save wizard state to localStorage:', error);
      }
    },
    []
  );

  // Set deployment profile and optional power user mode
  const setProfile = useCallback(
    (profile: DeploymentProfile, mode?: PowerUserMode) => {
      setDeploymentProfile(profile);
      setPowerUserMode(mode ?? null);
      setCurrentStep(0);
      setCompletedSteps(new Set());

      persistState({
        currentStep: 0,
        formData,
        completedSteps: new Set(),
        deploymentProfile: profile,
        powerUserMode: mode ?? null,
      });
    },
    [formData, persistState]
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
        deploymentProfile,
        powerUserMode,
      });
    }
  }, [currentStep, totalSteps, completedSteps, formData, deploymentProfile, powerUserMode, persistState]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;

      setCurrentStep(newStep);

      persistState({
        currentStep: newStep,
        formData,
        completedSteps,
        deploymentProfile,
        powerUserMode,
      });
    }
  }, [currentStep, formData, completedSteps, deploymentProfile, powerUserMode, persistState]);

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
          deploymentProfile,
          powerUserMode,
        });
      }
    },
    [totalSteps, completedSteps, formData, deploymentProfile, powerUserMode, persistState]
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
        deploymentProfile,
        powerUserMode,
      });
    },
    [formData, currentStep, completedSteps, deploymentProfile, powerUserMode, persistState]
  );

  // Reset wizard to initial state
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setFormData({});
    setCompletedSteps(new Set());
    setDeploymentProfile(null);
    setPowerUserMode(null);

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
    deploymentProfile,
    powerUserMode,
    totalSteps,
    nextStep,
    prevStep,
    goToStep,
    updateFormData,
    resetWizard,
    setProfile,
  };
}
