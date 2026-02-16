import { renderHook, act } from '@testing-library/react';
import { describe, test, expect, beforeEach } from 'vitest';
import { useWizardState } from './useWizardState';

describe('useWizardState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('initializes with step 0 and no profile', () => {
    const { result } = renderHook(() => useWizardState());
    expect(result.current.currentStep).toBe(0);
    expect(result.current.deploymentProfile).toBeNull();
    expect(result.current.totalSteps).toBe(0);
  });

  test('sets profile and derives totalSteps', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    expect(result.current.deploymentProfile).toBe('local');
    expect(result.current.totalSteps).toBe(4);
    expect(result.current.currentStep).toBe(0);
  });

  test('advances to next step after setting profile', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(1);
  });

  test('goes back to previous step', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(2);
    act(() => {
      result.current.prevStep();
    });
    expect(result.current.currentStep).toBe(1);
  });

  test('does not go below step 0', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.prevStep();
    });
    expect(result.current.currentStep).toBe(0);
  });

  test('does not exceed total steps', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(3);
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.currentStep).toBe(3);
  });

  test('updates form data', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.updateFormData('systemCheck', { acknowledged: true });
    });
    expect(result.current.formData.systemCheck).toEqual({ acknowledged: true });
  });

  test('marks steps as completed', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.nextStep();
    });
    expect(result.current.completedSteps.has(0)).toBe(true);
  });

  test('resets wizard state', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('local');
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.nextStep();
    });
    act(() => {
      result.current.updateFormData('systemCheck', { acknowledged: true });
    });
    act(() => {
      result.current.resetWizard();
    });
    expect(result.current.currentStep).toBe(0);
    expect(result.current.formData).toEqual({});
    expect(result.current.completedSteps.size).toBe(0);
    expect(result.current.deploymentProfile).toBeNull();
  });

  test('sets powerUserMode with advanced profile', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => {
      result.current.setProfile('advanced', 'docker');
    });
    expect(result.current.deploymentProfile).toBe('advanced');
    expect(result.current.powerUserMode).toBe('docker');
    expect(result.current.totalSteps).toBe(4);
  });
});
