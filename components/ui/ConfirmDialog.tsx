'use client';

import { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { LuTriangleAlert } from 'react-icons/lu';

interface ConfirmDialog {
  id: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

let confirmId = 0;
const listeners: Set<(dialog: ConfirmDialog | null) => void> = new Set();

export const showConfirm = (
  title: string,
  message: string,
  onConfirm: () => void,
  options?: {
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
  }
) => {
  const id = `confirm-${++confirmId}`;
  const dialog: ConfirmDialog = {
    id,
    title,
    message,
    confirmText: options?.confirmText || 'Confirm',
    cancelText: options?.cancelText || 'Cancel',
    isDangerous: options?.isDangerous || false,
    onConfirm: () => {
      onConfirm();
      closeConfirm(id);
    },
    onCancel: () => closeConfirm(id),
  };
  listeners.forEach(listener => listener(dialog));
};

export const closeConfirm = (id: string) => {
  listeners.forEach(listener => listener(null));
};

export function ConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialog | null>(null);

  const handleDialog = useCallback((newDialog: ConfirmDialog | null) => {
    setDialog(newDialog);
  }, []);

  useState(() => {
    listeners.add(handleDialog);
    return () => listeners.delete(handleDialog);
  });

  if (!dialog) return null;

  return (
    <Modal
      isOpen={!!dialog}
      onClose={dialog.onCancel}
      title={dialog.title}
      size="sm"
    >
      <div className="space-y-4">
        <div className="flex gap-3">
          {dialog.isDangerous && (
            <LuTriangleAlert className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          )}
          <p className="text-neutral-700">{dialog.message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={dialog.onCancel}
          >
            {dialog.cancelText}
          </Button>
          <Button
            type="button"
            onClick={dialog.onConfirm}
            className={dialog.isDangerous ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {dialog.confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
