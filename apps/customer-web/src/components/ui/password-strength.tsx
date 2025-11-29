import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

export interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  requirements: {
    label: string;
    met: boolean;
  }[];
}

/**
 * Calculate password strength and return requirements status
 */
function calculateStrength(password: string): StrengthResult {
  const requirements = [
    {
      label: 'Minimal 8 karakter',
      met: password.length >= 8,
    },
    {
      label: 'Mengandung huruf besar',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Mengandung huruf kecil',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Mengandung angka',
      met: /[0-9]/.test(password),
    },
  ];

  const metCount = requirements.filter((r) => r.met).length;

  const strengthMap: Record<number, { label: string; color: string }> = {
    0: { label: 'Sangat Lemah', color: 'bg-red-500' },
    1: { label: 'Lemah', color: 'bg-red-400' },
    2: { label: 'Cukup', color: 'bg-yellow-500' },
    3: { label: 'Kuat', color: 'bg-green-400' },
    4: { label: 'Sangat Kuat', color: 'bg-green-500' },
  };

  return {
    score: metCount,
    label: strengthMap[metCount].label,
    color: strengthMap[metCount].color,
    requirements,
  };
}

/**
 * Password Strength Indicator Component
 * Shows visual indicator of password strength and requirements
 */
export function PasswordStrength({ password, className }: PasswordStrengthProps) {
  const strength = useMemo(() => calculateStrength(password), [password]);

  // Don't show anything if password is empty
  if (!password) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--text-secondary)]">Kekuatan Password</span>
          <span
            className={cn(
              'font-medium',
              strength.score <= 1 && 'text-red-500',
              strength.score === 2 && 'text-yellow-500',
              strength.score >= 3 && 'text-green-500'
            )}
          >
            {strength.label}
          </span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-colors duration-200',
                index < strength.score
                  ? strength.color
                  : 'bg-[var(--border)]'
              )}
            />
          ))}
        </div>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        {strength.requirements.map((req, index) => (
          <div
            key={index}
            className="flex items-center gap-2 text-xs"
          >
            {req.met ? (
              <Check className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <X className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <span
              className={cn(
                req.met
                  ? 'text-green-600'
                  : 'text-[var(--text-muted)]'
              )}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PasswordStrength;
