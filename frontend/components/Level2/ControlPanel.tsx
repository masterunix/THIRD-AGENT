'use client';

import { motion } from 'framer-motion';
import { Play, FastForward, Zap, Square } from 'lucide-react';

interface ControlPanelProps {
  loading: boolean;
  onProcess: () => void;
  onProcessAll: () => void;
  onQuickTest: () => void;
  onStop: () => void;
  hasMore: boolean;
  isProcessingAll: boolean;
}

export default function ControlPanel({ 
  loading, 
  onProcess, 
  onProcessAll,
  onQuickTest,
  onStop,
  hasMore,
  isProcessingAll
}: ControlPanelProps) {
  return (
    <div className="space-y-3">
      {/* Primary Action */}
      <motion.button
        onClick={onProcess}
        disabled={loading || !hasMore || isProcessingAll}
        whileHover={{ scale: (loading || isProcessingAll) ? 1 : 1.02 }}
        whileTap={{ scale: (loading || isProcessingAll) ? 1 : 0.98 }}
        className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-neon-green to-neon-blue text-black font-semibold shadow-neon-green flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
          animate={{ x: loading ? ['-100%', '100%'] : '-100%' }}
          transition={{ duration: 1, repeat: loading ? Infinity : 0 }}
        />
        <Play className="w-4 h-4" />
        <span className="relative z-10">
          {loading ? 'Processing...' : hasMore ? 'Process Event' : 'All Done'}
        </span>
      </motion.button>

      {/* Secondary Actions */}
      {isProcessingAll ? (
        <motion.button
          onClick={onStop}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-sm font-medium flex items-center justify-center gap-2"
        >
          <Square className="w-3 h-3" />
          Stop Processing
        </motion.button>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <motion.button
            onClick={onProcessAll}
            disabled={!hasMore || loading}
            whileHover={{ scale: (!hasMore || loading) ? 1 : 1.02 }}
            whileTap={{ scale: (!hasMore || loading) ? 1 : 0.98 }}
            className="px-4 py-2 rounded-lg glass-light border border-white/10 hover:border-neon-green/50 text-white text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FastForward className="w-3 h-3" />
            Process All
          </motion.button>

          <motion.button
            onClick={onQuickTest}
            disabled={!hasMore || loading}
            whileHover={{ scale: (!hasMore || loading) ? 1 : 1.02 }}
            whileTap={{ scale: (!hasMore || loading) ? 1 : 0.98 }}
            className="px-4 py-2 rounded-lg bg-neon-blue/20 border border-neon-blue/40 text-neon-blue text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className="w-3 h-3" />
            Quick Test
          </motion.button>
        </div>
      )}
    </div>
  );
}
