'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown, Cpu } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

const PROVIDERS = [
  { id: 'azure', label: 'Azure OpenAI', model: 'gpt-5-nano', color: '#38bdf8', gradient: 'from-blue-500 to-cyan-400' },
  { id: 'gemini', label: 'Gemini', model: '2.5 Flash', color: '#a78bfa', gradient: 'from-purple-500 to-pink-400' },
  { id: 'pai', label: 'PAI', model: 'gemma4:26b', color: '#fb923c', gradient: 'from-amber-500 to-orange-400' },
];

export default function Header() {
  const [status, setStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [statusText, setStatusText] = useState('Connecting...');
  const [activeProvider, setActiveProvider] = useState('azure');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkBackendHealth();
    fetchProvider();
    const interval = setInterval(checkBackendHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/health`);
      const data = await response.json();
      
      if (data.status === 'healthy') {
        const version = data.version || '1.0';
        const tools = data.tools_available ? ` · ${data.tools_available} tools` : '';
        setStatus('online');
        setStatusText(`Online · v${version}${tools}`);
      } else {
        setStatus('offline');
        setStatusText('Backend Error');
      }
    } catch (error) {
      setStatus('offline');
      setStatusText('Offline');
    }
  };

  const fetchProvider = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/get-provider`);
      if (res.ok) {
        const data = await res.json();
        setActiveProvider(data.active_provider || 'azure');
      }
    } catch (e) {
      console.warn('Failed to fetch provider:', e);
    }
  };

  const switchProvider = async (providerId: string) => {
    setSwitching(true);
    try {
      const res = await fetch(`${BACKEND_URL}/set-provider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerId })
      });
      if (res.ok) {
        setActiveProvider(providerId);
      }
    } catch (e) {
      console.warn('Failed to switch provider:', e);
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  };

  const current = PROVIDERS.find(p => p.id === activeProvider) || PROVIDERS[0];

  return (
    <motion.header 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/10"
    >
      <div className="max-w-[1600px] mx-auto px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <motion.div 
            className="flex items-center gap-4"
            whileHover={{ scale: 1.02 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center font-bold text-xl text-black shadow-neon-green">
              GF
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gradient">
                GlobalFreight AI Platform
              </h1>
              <p className="text-sm text-white/60">AI-Fortnight 2026</p>
            </div>
          </motion.div>

          <div className="flex items-center gap-4">
            {/* Model Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <motion.button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
              >
                <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${current.gradient}`} />
                <div className="flex flex-col items-start">
                  <span className="text-xs text-white/50 leading-none">Model</span>
                  <span className="text-sm font-semibold text-white leading-tight">{current.label} <span className="text-white/40 font-normal">· {current.model}</span></span>
                </div>
                <motion.div
                  animate={{ rotate: dropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="w-4 h-4 text-white/40" />
                </motion.div>
              </motion.button>

              <AnimatePresence>
                {dropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 rounded-xl bg-black/95 backdrop-blur-2xl border border-white/15 shadow-2xl overflow-hidden z-[100]"
                  >
                    <div className="px-3 py-2 border-b border-white/5">
                      <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Select AI Provider</span>
                    </div>
                    {PROVIDERS.map((provider) => (
                      <motion.button
                        key={provider.id}
                        onClick={() => switchProvider(provider.id)}
                        disabled={switching}
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                        className={`w-full flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer ${
                          activeProvider === provider.id ? 'bg-white/5' : ''
                        } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${provider.gradient} ${
                          activeProvider === provider.id ? 'ring-2 ring-white/30 ring-offset-1 ring-offset-black' : ''
                        }`} />
                        <div className="flex flex-col items-start flex-1">
                          <span className="text-sm font-medium text-white">{provider.label}</span>
                          <span className="text-xs text-white/40">{provider.model}</span>
                        </div>
                        {activeProvider === provider.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-1.5 h-1.5 rounded-full bg-neon-green"
                          />
                        )}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status */}
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 glass-light rounded-full"
              whileHover={{ scale: 1.05 }}
            >
              <motion.div
                animate={{
                  scale: status === 'online' ? [1, 1.2, 1] : 1,
                  opacity: status === 'online' ? [1, 0.6, 1] : 0.5,
                }}
                transition={{
                  duration: 2,
                  repeat: status === 'online' ? Infinity : 0,
                  ease: "easeInOut",
                }}
                className={`w-2 h-2 rounded-full ${
                  status === 'online' ? 'bg-neon-green shadow-neon-green' : 'bg-red-500'
                }`}
              />
              <span className={`text-sm font-medium ${
                status === 'online' ? 'text-neon-green' : 'text-red-500'
              }`}>
                {statusText}
              </span>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
