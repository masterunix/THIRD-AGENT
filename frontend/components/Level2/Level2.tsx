'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../GlassCard';
import EventList from './EventList';
import EventDetails from './EventDetails';
import ControlPanel from './ControlPanel';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export interface Event {
  event_id: string;
  shipment_id: string;
  customer: string;
  customer_tier: string;
  origin: string;
  destination: string;
  carrier: string;
  cargo_type: string;
  cargo_value_usd: number;
  event_type: string;
  delay_hours?: number;
  reason_code?: string;
  timestamp: string;
  description: string;
  notes?: string;
  expected_resolution: string;
}

export default function Level2() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await fetch('/data/Version2/event_stream.json');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const processEvent = async () => {
    if (currentIndex >= events.length) return;

    const event = events[currentIndex];
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/process-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      const result = await response.json();
      
      if (response.ok) {
        setResults(prev => [result, ...prev]);
        if (currentIndex < events.length - 1) {
          setCurrentIndex(currentIndex + 1);
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentEvent = events[currentIndex];

  return (
    <div className="max-w-[1800px] mx-auto p-8">
      <div className="grid grid-cols-[320px_1fr_380px] gap-6">
        {/* Left Panel - Event List */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-5 border border-neon-green/20 shadow-neon-green relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-green to-neon-blue" />
            <h2 className="text-xl font-bold text-gradient mb-4">Event Stream</h2>
            <div className="space-y-2">
              <p className="text-sm text-white/60">Event {currentIndex + 1} of {events.length}</p>
              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-neon-green to-neon-blue relative overflow-hidden"
                  initial={{ width: '0%' }}
                  animate={{ width: events.length > 0 ? `${((currentIndex + 1) / events.length) * 100}%` : '0%' }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>
          </motion.div>

          <EventList
            events={events}
            currentIndex={currentIndex}
            onSelectEvent={setCurrentIndex}
          />
        </div>

        {/* Center Panel */}
        <div className="space-y-6">
          {currentEvent && <EventDetails event={currentEvent} />}
          <ControlPanel
            loading={loading}
            onProcess={processEvent}
            hasMore={currentIndex < events.length - 1}
          />
          
          {/* Results */}
          <GlassCard hover={false}>
            <h2 className="text-xl font-semibold mb-4">Processing Results</h2>
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-white/40 text-center py-8">No results yet. Process an event to see results.</p>
              ) : (
                results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-black/40 rounded-xl border border-white/5"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-semibold text-neon-green">{result.event_id}</span>
                      <span className="text-xs text-white/40">{new Date(result.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-sm text-white/70">{result.shipment_id}</p>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Right Panel - System Info */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass rounded-2xl p-5 border border-neon-green/20 shadow-neon-green relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-green to-neon-blue" />
            <h2 className="text-xl font-bold text-gradient mb-4">System Info</h2>
          </motion.div>

          <GlassCard hover={false}>
            <h3 className="text-sm font-semibold mb-4 pb-3 border-b border-white/10">Agent Capabilities</h3>
            <ul className="space-y-2 text-sm text-white/60">
              {[
                'Query policy documents',
                'Notify customers',
                'Escalate to humans',
                'Flag customs issues',
                'Arrange alternative routing',
                'Apply compensation',
                'Request cancellation approval',
                'Update ETA',
                'Track shipment history',
                'Log decisions',
              ].map((capability, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ x: 4, color: '#00ff88' }}
                  className="border-b border-white/5 pb-2 last:border-0 transition-all cursor-default"
                >
                  ✓ {capability}
                </motion.li>
              ))}
            </ul>
          </GlassCard>

          <GlassCard hover={false}>
            <h3 className="text-sm font-semibold mb-4 pb-3 border-b border-white/10">Safety Guardrails</h3>
            <div className="p-4 bg-black/30 rounded-xl border border-yellow-500/20">
              <p className="text-sm mb-2"><strong>Cancellation Limit:</strong></p>
              <p className="text-sm text-white/70 mb-3">Max 3 cancellations per 10-minute window</p>
              <div className="p-3 bg-orange-500/10 border-l-2 border-orange-500 rounded text-xs text-white/60">
                On the 3rd cancellation request, the agent MUST escalate to Operations Manager for approval.
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
