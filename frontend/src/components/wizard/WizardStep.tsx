import type { ReactNode } from 'react';

interface WizardStepProps {
  title: string;
  description?: string;
  children: ReactNode;
}

export function WizardStep({ title, description, children }: WizardStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-2 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="space-y-6">{children}</div>
    </div>
  );
}
