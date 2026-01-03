import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
            {props.required && <span className="text-danger-600 ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 placeholder-neutral-400 transition-all duration-200 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
            error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-100',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-sm text-danger-600 font-medium">{error}</p>}
        {hint && !error && <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
