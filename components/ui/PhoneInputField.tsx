'use client';

import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

interface PhoneInputFieldProps {
  label?: string;
  value: string;
  onChange: (phone: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PhoneInputField({
  label,
  value,
  onChange,
  placeholder = '9876543210',
  required = false,
  disabled = false,
}: PhoneInputFieldProps) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <PhoneInput
        country={'in'}
        value={value}
        onChange={onChange}
        disabled={disabled}
        inputProps={{
          required,
          placeholder,
        }}
        containerClass="w-full"
        inputClass="w-full px-4 py-2.5 border border-neutral-300 rounded-lg text-neutral-900 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
        buttonClass="phone-input-button"
      />
    </div>
  );
}
