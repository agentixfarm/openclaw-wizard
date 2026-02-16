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
    ok: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30',
    warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/30',
    error: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30',
    neutral: 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800',
  };

  const textColors = {
    ok: 'text-green-900 dark:text-green-300',
    warning: 'text-yellow-900 dark:text-yellow-300',
    error: 'text-red-900 dark:text-red-300',
    neutral: 'text-gray-900 dark:text-gray-100',
  };

  return (
    <div className={`rounded-lg shadow border p-4 ${statusColors[status]}`}>
      <div className="flex items-center gap-2">
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div className="flex-1">
          <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
          <p className={`text-2xl font-bold ${textColors[status]}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
