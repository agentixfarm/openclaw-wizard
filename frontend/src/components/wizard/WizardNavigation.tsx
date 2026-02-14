import { useWizard } from './WizardProvider';
import clsx from 'clsx';

interface WizardNavigationProps {
  onNext?: () => void | Promise<void>;
  onSkip?: () => void | Promise<void>;
  isSubmitting?: boolean;
  nextLabel?: string;
  showSkip?: boolean;
  skipLabel?: string;
}

export function WizardNavigation({
  onNext,
  onSkip,
  isSubmitting = false,
  nextLabel = 'Next',
  showSkip = false,
  skipLabel = 'Skip',
}: WizardNavigationProps) {
  const { currentStep, prevStep, totalSteps } = useWizard();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  const handleNext = async () => {
    if (onNext) {
      await onNext();
    }
  };

  const handleSkip = async () => {
    if (onSkip) {
      await onSkip();
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <div className="flex items-center justify-between">
        {/* Back button */}
        <button
          type="button"
          onClick={prevStep}
          disabled={isFirstStep || isSubmitting}
          className={clsx(
            'px-4 py-2 text-sm font-medium rounded-md transition-colors',
            {
              'invisible': isFirstStep,
              'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50':
                !isFirstStep && !isSubmitting,
              'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed':
                !isFirstStep && isSubmitting,
            }
          )}
        >
          Back
        </button>

        {/* Right side buttons */}
        <div className="flex items-center gap-3">
          {/* Skip button (optional) */}
          {showSkip && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={isSubmitting}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-md transition-colors',
                {
                  'text-gray-600 hover:text-gray-800': !isSubmitting,
                  'text-gray-400 cursor-not-allowed': isSubmitting,
                }
              )}
            >
              {skipLabel}
            </button>
          )}

          {/* Next button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className={clsx(
              'px-6 py-2 text-sm font-medium rounded-md transition-colors',
              {
                'bg-blue-600 text-white hover:bg-blue-700': !isSubmitting,
                'bg-blue-400 text-white cursor-not-allowed': isSubmitting,
              }
            )}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Processing...</span>
              </span>
            ) : (
              <span>{isLastStep ? 'Finish' : nextLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
