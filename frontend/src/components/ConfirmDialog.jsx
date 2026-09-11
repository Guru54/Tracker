import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmContext = createContext(null);

export const ConfirmProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null); // { message, title }
  const resolveRef = useRef(null);

  const confirm = useCallback((message, options = {}) => {
    setDialog({ message, title: options.title || 'Are you sure?' });
    return new Promise((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleChoice = (result) => {
    setDialog(null);
    if (resolveRef.current) {
      resolveRef.current(result);
      resolveRef.current = null;
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal-overlay" onClick={() => handleChoice(false)}>
          <div
            className="modal-content max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{dialog.title}</h3>
                <p className="text-sm text-dark-400 mt-1">{dialog.message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleChoice(false)}
                className="flex-1 py-2.5 bg-dark-700 hover:bg-dark-600 text-white 
                         rounded-lg font-medium transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => handleChoice(true)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white 
                         rounded-lg font-medium transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};

// const confirm = useConfirm(); if (await confirm('Delete this?')) { ... }
export const useConfirm = () => {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within a ConfirmProvider');
  return ctx;
};
