import { create } from 'zustand';
import type { ToastType } from '@reprise/shared';

export type { ToastType };

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState {
  toast: (ToastOptions & { id: number }) | null;
  showToast: (options: ToastOptions) => void;
  hideToast: () => void;
}

let toastTimer: ReturnType<typeof setTimeout> | null = null;
let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toast: null,
  showToast: (options) => {
    if (toastTimer) clearTimeout(toastTimer);
    const id = ++toastCounter;
    const duration = options.duration ?? 3000;

    set({
      toast: {
        ...options,
        id,
        type: options.type ?? 'info',
      },
    });

    toastTimer = setTimeout(() => {
      set({ toast: null });
    }, duration);
  },
  hideToast: () => {
    if (toastTimer) clearTimeout(toastTimer);
    set({ toast: null });
  },
}));

export const toast = {
  success: (message: string, duration?: number) =>
    useToastStore.getState().showToast({ message, type: 'success', duration }),
  info: (message: string, duration?: number) =>
    useToastStore.getState().showToast({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) =>
    useToastStore.getState().showToast({ message, type: 'warning', duration }),
  error: (message: string, duration?: number) =>
    useToastStore.getState().showToast({ message, type: 'error', duration }),
};
