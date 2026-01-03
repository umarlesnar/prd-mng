'use client';

import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { LuX } from 'react-icons/lu';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, children, size = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity backdrop-blur-sm" onClick={onClose} />
        
        <div
          className={cn(
            'relative bg-white rounded-xl shadow-2xl w-full border border-neutral-200',
            {
              'max-w-md': size === 'sm',
              'max-w-lg': size === 'md',
              'max-w-2xl': size === 'lg',
              'max-w-4xl': size === 'xl',
            }
          )}
        >
          {title && (
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200 bg-neutral-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-200"
              >
                <LuX className="w-5 h-5" />
              </button>
            </div>
          )}
          <div className="px-6 py-5">{children}</div>
          {footer && (
            <div className="px-6 py-4 border-t border-neutral-200 bg-neutral-50 rounded-b-xl flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}