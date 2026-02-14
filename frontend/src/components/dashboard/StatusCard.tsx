import { type ReactNode } from 'react';

interface StatusCardProps {
  title: string;
  value: string;
  subtitle?: string;
  status?: 'ok' | 'warning' | 'error' | 'neutral';
  icon?: ReactNode;
}

/**
 * Reusable status card component for displaying labeled values with optional status color
 */
export function StatusCard({ title, value, subtitle, status = 'neutral', icon }: StatusCardProps) {
  const statusColors = {
    ok: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
    neutral: 'border-gray-200 bg-white',
  };

  const textColors = {
    ok: 'text-green-900',
    warning: 'text-yellow-900',
    error: 'text-red-900',
    neutral: 'text-gray-900',
  };

  return (
    <div className={`rounded-lg shadow border p-4 ${statusColors[status]}`}>
      <div className="flex items-center gap-2">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className={`text-2xl font-bold ${textColors[status]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
