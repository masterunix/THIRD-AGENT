'use client';

import { motion } from 'framer-motion';
import GlassCard from '../GlassCard';
import { Event } from './Level2';

interface EventDetailsProps {
  event: Event;
}

export default function EventDetails({ event }: EventDetailsProps) {
  return (
    <GlassCard hover={false}>
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
        <h3 className="text-2xl font-bold text-gradient">{event.event_id}</h3>
      </div>

      {/* Shipment Information */}
      <Section title="Shipment Information">
        <InfoGrid>
          <InfoItem label="Shipment ID" value={event.shipment_id} />
          <InfoItem label="Customer" value={event.customer} />
          <InfoItem label="Tier" value={event.customer_tier} />
          <InfoItem label="Route" value={`${event.origin} → ${event.destination}`} />
          <InfoItem label="Carrier" value={event.carrier} />
          <InfoItem label="Cargo" value={event.cargo_type} />
          <InfoItem label="Value" value={`$${event.cargo_value_usd.toLocaleString()}`} />
        </InfoGrid>
      </Section>

      {/* Event Details */}
      <Section title="Event Details">
        <InfoGrid>
          <InfoItem label="Type" value={event.event_type} />
          <InfoItem label="Delay" value={event.delay_hours ? `${event.delay_hours} hours` : 'N/A'} />
          <InfoItem label="Reason Code" value={event.reason_code || 'N/A'} />
          <InfoItem label="Timestamp" value={event.timestamp} />
        </InfoGrid>
      </Section>

      {/* Description */}
      <Section title="Description">
        <p className="text-white/70 leading-relaxed">{event.description}</p>
      </Section>

      {/* Notes */}
      {event.notes && (
        <Section title="Policy Notes">
          <div className="p-4 bg-neon-blue/5 border-l-2 border-neon-blue rounded-lg">
            <p className="text-neon-blue/90 text-sm leading-relaxed">{event.notes}</p>
          </div>
        </Section>
      )}

      {/* Expected Resolution */}
      <Section title="Expected Resolution">
        <p className="text-white/60 leading-relaxed text-sm">{event.expected_resolution}</p>
      </Section>
    </GlassCard>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 p-4 bg-black/20 rounded-xl border border-white/5"
    >
      <h4 className="text-sm font-semibold text-neon-green uppercase tracking-wider mb-3">
        {title}
      </h4>
      {children}
    </motion.div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-white/2 rounded-lg">
      <div className="text-xs text-white/50 mb-1">{label}</div>
      <div className="text-sm text-white/90 font-medium">{value}</div>
    </div>
  );
}
