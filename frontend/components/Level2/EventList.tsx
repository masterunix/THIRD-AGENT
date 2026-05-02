'use client';

import { motion } from 'framer-motion';
import { Event } from './Level2';

interface EventListProps {
  events: Event[];
  currentIndex: number;
  onSelectEvent: (index: number) => void;
}

function assessSeverity(event: Event): 'critical' | 'high' | 'medium' | 'low' {
  const cargo = event.cargo_type.toLowerCase();
  const tier = event.customer_tier;
  const delay = event.delay_hours || 0;
  const type = event.event_type;

  if (cargo.includes('pharma') || cargo.includes('medical') || cargo.includes('cold chain')) {
    return 'critical';
  }
  if (cargo.includes('perishable') && delay > 4) {
    return 'critical';
  }
  if (type === 'cancellation_request') {
    return 'critical';
  }
  if (tier === 'Platinum' && delay > 4) {
    return 'high';
  }
  if (type === 'customs_hold') {
    return 'high';
  }
  if (tier === 'Gold' && delay > 8) {
    return 'medium';
  }
  return 'low';
}

const severityColors = {
  critical: {
    bg: 'from-red-500/25 to-red-500/15',
    border: 'border-red-500/40',
    text: 'text-red-400',
    shadow: 'shadow-red-500/30',
  },
  high: {
    bg: 'from-orange-500/25 to-orange-500/15',
    border: 'border-orange-500/40',
    text: 'text-orange-400',
    shadow: 'shadow-orange-500/30',
  },
  medium: {
    bg: 'from-yellow-500/25 to-yellow-500/15',
    border: 'border-yellow-500/40',
    text: 'text-yellow-400',
    shadow: 'shadow-yellow-500/30',
  },
  low: {
    bg: 'from-neon-green/25 to-neon-green/15',
    border: 'border-neon-green/40',
    text: 'text-neon-green',
    shadow: 'shadow-neon-green/30',
  },
};

export default function EventList({ events, currentIndex, onSelectEvent }: EventListProps) {
  return (
    <div className="space-y-3">
      {events.map((event, index) => {
        const severity = assessSeverity(event);
        const colors = severityColors[severity];
        const isActive = index === currentIndex;

        return (
          <motion.div
            key={event.event_id}
            onClick={() => onSelectEvent(index)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: isActive ? 6 : 0 }}
            whileHover={{ x: 6, scale: 1.02 }}
            className={`
              p-4 rounded-2xl cursor-pointer transition-all relative overflow-hidden
              ${isActive 
                ? `bg-gradient-to-br ${colors.bg} border ${colors.border} ${colors.shadow}` 
                : 'glass-light border border-white/5 hover:border-neon-green/30'
              }
            `}
          >
            {/* Left accent bar */}
            <motion.div
              className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-neon-green to-neon-blue`}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: isActive ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            />

            <div className="flex justify-between items-start mb-2">
              <span className={`font-semibold text-sm ${isActive ? colors.text : 'text-white/80'}`}>
                {event.event_id}
              </span>
              <span className={`
                px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide
                bg-gradient-to-br ${colors.bg} ${colors.text} border ${colors.border}
              `}>
                {severity}
              </span>
            </div>

            <div className="space-y-1 text-xs text-white/60">
              <div className="font-medium text-white/80">{event.shipment_id}</div>
              <div className={colors.text}>{event.event_type}</div>
              <div>{event.customer_tier}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
