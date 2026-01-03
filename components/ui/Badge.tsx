import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'default' | 'primary';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold',
        {
          'bg-success-100 text-success-700': variant === 'success',
          'bg-warning-100 text-warning-600': variant === 'warning',
          'bg-danger-100 text-danger-700': variant === 'danger',
          'bg-primary-100 text-primary-700': variant === 'info' || variant === 'primary',
          'bg-neutral-100 text-neutral-700': variant === 'default',
        },
        className
      )}
      {...props}
    />
  );
}
