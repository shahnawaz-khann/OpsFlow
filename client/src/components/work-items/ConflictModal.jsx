import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button.jsx';

export function ConflictModal({ isOpen, message, onRefresh, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-slate-900">Conflict Detected (409)</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {message ||
                'This item was updated by someone else while you were viewing it. Please reload the latest version to review changes before making further edits.'}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="md" onClick={onClose}>
            Review My Input
          </Button>
          <Button variant="primary" size="md" icon={RefreshCw} onClick={onRefresh}>
            Reload Latest Record
          </Button>
        </div>
      </div>
    </div>
  );
}
