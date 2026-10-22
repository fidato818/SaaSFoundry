/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto p-3.5 rounded-lg border shadow-lg text-xs flex items-start gap-2.5 transition-all animate-in slide-in-from-bottom-2 duration-150 ${
            toast.type === 'success'
              ? 'bg-slate-900 text-white border-slate-800'
              : toast.type === 'error'
              ? 'bg-red-900 text-white border-red-800'
              : 'bg-white text-slate-900 border-slate-200'
          }`}
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />}

          <div className="flex-1 font-medium leading-snug">{toast.text}</div>

          <button
            onClick={() => onDismiss(toast.id)}
            className="text-slate-400 hover:text-white p-0.5 ml-1 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
