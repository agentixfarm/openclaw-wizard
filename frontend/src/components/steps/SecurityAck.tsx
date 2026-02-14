import { useState } from 'react';
import { useWizard } from '../wizard/WizardProvider';
import { WizardStep } from '../wizard/WizardStep';
import { WizardNavigation } from '../wizard/WizardNavigation';

export function SecurityAck() {
  const { updateFormData, nextStep, formData } = useWizard();
  const [acknowledged, setAcknowledged] = useState(
    formData.securityAck?.acknowledged || false
  );

  const handleNext = () => {
    if (!acknowledged) {
      return;
    }
    updateFormData('securityAck', {
      acknowledged: true,
      timestamp: Date.now(),
    });
    nextStep();
  };

  return (
    <WizardStep
      title="Security Acknowledgement"
      description="Please read and acknowledge the security implications of running OpenClaw"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Warning Box */}
        <div className="border-2 border-orange-700 bg-amber-50 dark:bg-amber-950 rounded-lg p-6">
          <div className="flex gap-4">
            <svg
              className="w-8 h-8 text-orange-700 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Security Notice
              </h3>
              <p className="text-gray-700 dark:text-gray-300 mb-3">
                OpenClaw grants AI agents full shell access to execute commands on your system.
                Only connect channels you trust and monitor logs regularly.
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                <li>AI agents can read, write, and execute files</li>
                <li>Commands run with your user privileges</li>
                <li>Malicious prompts could harm your system</li>
                <li>Review all connected channels and their permissions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id="security-ack"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-1 w-4 h-4 text-sky-400 border-gray-300 rounded focus:ring-sky-400"
          />
          <label
            htmlFor="security-ack"
            className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
          >
            I understand the security implications and accept the risks of running OpenClaw
            with AI agent access to my system.
          </label>
        </div>

        <WizardNavigation
          onNext={handleNext}
        />
      </div>
    </WizardStep>
  );
}
