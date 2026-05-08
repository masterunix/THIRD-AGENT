'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface FallbackToastProps {
  fallback: {
    requested: string;
    actual: string;
  } | null;
  onClose: () => void;
}

const FallbackToast: React.FC<FallbackToastProps> = ({ fallback, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (fallback && fallback.requested !== fallback.actual) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Allow animation to finish
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [fallback, onClose]);

  if (!fallback || fallback.requested === fallback.actual) return null;

  return (
    <div
      className={`fixed bottom-8 right-8 z-[9999] transition-all duration-500 transform ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'
      }`}
    >
      <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-5 shadow-2xl max-w-sm flex items-start gap-4">
        <div className="bg-amber-500/20 p-2 rounded-lg">
          <AlertCircle className="w-6 h-6 text-amber-400" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-amber-400 font-bold text-sm mb-1 tracking-wide uppercase">
            Auto-Fallback Triggered
          </h3>
          <p className="text-slate-300 text-xs leading-relaxed">
            The requested provider <span className="text-white font-semibold">{fallback.requested}</span> was unreachable. 
            System automatically switched to <span className="text-amber-400 font-bold">{fallback.actual}</span> to ensure continuity.
          </p>
        </div>

        <button 
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute -bottom-1 left-4 right-4 h-[2px] bg-amber-500/20 rounded-full overflow-hidden">
        <div className="h-full bg-amber-500 animate-shrink-width" style={{ animation: 'shrink 6s linear forwards' }} />
      </div>

      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-shrink-width {
          animation-timing-function: linear;
        }
      `}</style>
    </div>
  );
};

export default FallbackToast;
