import { useWizard } from './WizardProvider';
import type { WizardStep } from './WizardProvider';
import clsx from 'clsx';

interface StepperProps {
  steps: WizardStep[];
}

export function Stepper({ steps }: StepperProps) {
  const { currentStep, completedSteps } = useWizard();

  return (
    <>
      {/* Mobile view: compact step counter */}
      <div className="md:hidden text-center py-4">
        <p className="text-sm font-medium text-gray-600">
          Step {currentStep + 1} of {steps.length}
        </p>
        <p className="text-xs text-gray-500 mt-1">{steps[currentStep].label}</p>
      </div>

      {/* Desktop view: full progress stepper */}
      <div className="hidden md:block">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => {
              const isCompleted = completedSteps.has(index);
              const isCurrent = currentStep === index;
              const isFuture = !isCompleted && !isCurrent;

              return (
                <li key={step.id} className="relative flex-1">
                  <div className="flex items-center">
                    {/* Circle indicator */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={clsx(
                          'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all',
                          {
                            // Completed step: green with checkmark
                            'border-green-500 bg-green-500 text-white': isCompleted,
                            // Current step: blue with pulsing ring
                            'border-blue-500 bg-blue-500 text-white': isCurrent,
                            // Future step: gray
                            'border-gray-300 bg-white text-gray-500': isFuture,
                          }
                        )}
                      >
                        {isCompleted ? (
                          // Checkmark for completed steps
                          <svg
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          // Step number
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                      </div>

                      {/* Pulsing ring animation for current step */}
                      {isCurrent && (
                        <span className="absolute flex h-12 w-12 animate-ping rounded-full bg-blue-400 opacity-30" />
                      )}
                    </div>

                    {/* Connector line (not shown for last step) */}
                    {index < steps.length - 1 && (
                      <div
                        className={clsx(
                          'flex-1 h-0.5 mx-2 transition-all',
                          {
                            'bg-green-500': isCompleted,
                            'bg-gray-300': !isCompleted,
                          }
                        )}
                      />
                    )}
                  </div>

                  {/* Step label */}
                  <div className="mt-2 text-center">
                    <p
                      className={clsx('text-sm font-medium', {
                        'text-green-600': isCompleted,
                        'text-blue-600': isCurrent,
                        'text-gray-500': isFuture,
                      })}
                    >
                      {step.label}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </div>
    </>
  );
}
