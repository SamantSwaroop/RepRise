import { create } from 'zustand';

export interface ConfirmDialogOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmState {
  isOpen: boolean;
  options: ConfirmDialogOptions | null;
  showConfirm: (options: ConfirmDialogOptions) => void;
  closeConfirm: () => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  isOpen: false,
  options: null,
  showConfirm: (options) => set({ isOpen: true, options }),
  closeConfirm: () => set({ isOpen: false, options: null }),
}));
