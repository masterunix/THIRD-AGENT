'use client';

import { motion } from 'framer-motion';
import { MessageSquare, Zap, Network } from 'lucide-react';

interface TabSwitcherProps {
  activeTab: 'level1' | 'level2' | 'level3';
  onTabChange: (tab: 'level1' | 'level2' | 'level3') => void;
}

export default function TabSwitcher({ activeTab, onTabChange }: TabSwitcherProps) {
  const tabs = [
    {
      id: 'level1' as const,
      icon: MessageSquare,
      label: 'Level 1: RAG Assistant',
      description: 'Grounded Q&A from policy documents',
    },
    {
      id: 'level2' as const,
      icon: Zap,
      label: 'Level 2: Exception Handler',
      description: 'Autonomous agent with safety guardrails',
    },
    {
      id: 'level3' as const,
      icon: Network,
      label: 'Level 3: Route Optimizer',
      description: 'Stateful multi-crisis decision workflow',
    },
  ];

  return (
    <div className="max-w-[1600px] mx-auto px-8 pt-3">
      <div className="flex gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex-1 flex items-center gap-3 px-4 py-3 rounded-t-xl
                transition-all duration-300 relative overflow-hidden
                ${isActive 
                  ? 'glass border border-neon-green border-b-transparent shadow-neon-green' 
                  : 'glass-light border border-white/5 hover:border-neon-green/30'
                }
              `}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              {/* Top gradient bar */}
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-green to-neon-blue"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              {/* Gradient overlay on hover */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-b from-neon-green/10 to-transparent opacity-0"
                animate={{ opacity: isActive ? 1 : 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />

              {/* Content */}
              <div className="relative z-10 flex items-center gap-3">
                <Icon 
                  className={`w-5 h-5 ${isActive ? 'text-neon-green' : 'text-white/60'}`}
                  style={{ filter: isActive ? 'drop-shadow(0 0 8px currentColor)' : 'none' }}
                />
                <span className={`font-semibold text-sm whitespace-nowrap ${
                  isActive ? 'text-white' : 'text-white/80'
                }`}>
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
