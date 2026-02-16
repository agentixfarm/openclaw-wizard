interface AsciiLogoProps {
  label?: string;
}

const CLAW_ART = `  /\\_/\\
 ( o.o )
  > ^ <`;

export function AsciiLogo({ label }: AsciiLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <pre className="font-mono text-xs leading-tight text-sky-400 select-none" aria-hidden="true">
        {CLAW_ART}
      </pre>
      <div className="flex flex-col">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          OpenClaw
        </span>
        {label && (
          <span className="text-xs text-gray-500 dark:text-gray-400 -mt-0.5">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
