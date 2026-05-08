'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Activity,
  Shield,
  Zap,
  FileText,
  Upload,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import GlassCard from '../GlassCard';
import EventList from './EventList';
import EventDetails from './EventDetails';
import ControlPanel from './ControlPanel';
import FallbackToast from '../FallbackToast';

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

interface Stats {
  total: number;
  processed: number;
  pending: number;
  critical: number;
  avgProcessingTime: number;
}

interface ProcessingResult {
  event_id: string;
  shipment_id: string;
  timestamp: string;
  duration: number;
  agent_response?: string;
  actions_taken?: number;
  error?: string;
  [key: string]: any;
}

interface AuditLogEntry {
  action: string;
  event_id?: string;
  shipment_id?: string;
  decision?: string;
  reasoning?: string;
  severity?: string;
  timestamp: string;
  [key: string]: any;
}

export default function Level2Enhanced() {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    processed: 0,
    pending: 0,
    critical: 0,
    avgProcessingTime: 0
  });
  
  // Guardrail tracking
  const [cancellationTimestamps, setCancellationTimestamps] = useState<number[]>([]);
  const [guardrailStatus, setGuardrailStatus] = useState<'OK' | 'WARNING' | 'BREACH'>('OK');
  
  // UI state
  const [error, setError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [processingMode, setProcessingMode] = useState<'NONE' | 'ALL' | 'TEST'>('NONE');
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<string>('');
  const [processedCount, setProcessedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [activeProvider, setActiveProvider] = useState('azure');
  const [fallback, setFallback] = useState<{ requested: string; actual: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditScrollRef = useRef<HTMLDivElement>(null);

  const isProcessingAll = processingMode !== 'NONE';

  useEffect(() => {
    loadEvents();
    fetchAuditLogs();
    fetchActiveProvider();
  }, []);

  const fetchActiveProvider = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/get-provider`);
      if (res.ok) {
        const data = await res.json();
        setActiveProvider(data.active_provider);
        return data.active_provider as string;
      }
    } catch (e) {
      console.warn('Failed to fetch active provider:', e);
    }
    return activeProvider;
  };

  useEffect(() => {
    updateStats();
  }, [events, results]);
  
  useEffect(() => {
    updateGuardrailStatus();
  }, [cancellationTimestamps]);

  // Poll audit logs while processing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (processingMode !== 'NONE' || loading) {
      interval = setInterval(fetchAuditLogs, 2000);
    }
    return () => clearInterval(interval);
  }, [processingMode, loading]);

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/audit-log`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.audit_log || []);
      }
    } catch (e) {
      console.warn('Failed to fetch audit logs:', e);
    }
  };

  // Auto-scroll audit logs to top (newest) when new entries arrive
  useEffect(() => {
    if (auditScrollRef.current && auditLogs.length > 0) {
      auditScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [auditLogs.length]);

  useEffect(() => {
    if (processingMode !== 'NONE' && !error && !loading) {
      if (currentIndex >= events.length || (targetIndex !== null && currentIndex >= targetIndex)) {
        setProcessingMode('NONE');
        return;
      }
      
      const timer = setTimeout(() => {
        processEvent();
      }, 500);
      
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, processingMode, events.length, targetIndex, error, loading]);

  const loadEvents = async () => {
    try {
      const response = await fetch('/data/Version2/event_stream.json');
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (error) {
      console.error('Error loading events:', error);
      setError('Failed to load events. Please check the data file.');
    }
  };
  
  const updateGuardrailStatus = () => {
    const now = Date.now();
    const recentCancellations = cancellationTimestamps.filter(
      t => now - t < 10 * 60 * 1000 // Last 10 minutes
    );
    
    if (recentCancellations.length >= 2) {
      setGuardrailStatus('BREACH');
    } else if (recentCancellations.length >= 1) {
      setGuardrailStatus('WARNING');
    } else {
      setGuardrailStatus('OK');
    }
  };
  
  const checkGuardrail = (event: Event): { allowed: boolean; reason?: string } => {
    if (event.event_type === 'cancellation_request') {
      const now = Date.now();
      const recentCancellations = cancellationTimestamps.filter(
        t => now - t < 10 * 60 * 1000
      );
      
      if (recentCancellations.length >= 2) {
        return {
          allowed: false,
          reason: `GUARDRAIL BREACH: 3rd cancellation in last 10 minutes. Operations Manager approval required.`
        };
      }
    }
    return { allowed: true };
  };

  const updateStats = () => {
    const critical = events.filter(e => {
      const cargo = e.cargo_type.toLowerCase();
      return cargo.includes('pharma') || cargo.includes('medical') || 
             cargo.includes('perishable') || e.event_type === 'cancellation_request';
    }).length;

    setStats({
      total: events.length,
      processed: results.length,
      pending: events.length - results.length,
      critical,
      avgProcessingTime: results.length > 0 
        ? results.reduce((acc, r) => acc + (r.duration || 0), 0) / results.length 
        : 0
    });
  };

  const processEvent = async () => {
    if (currentIndex >= events.length) return;

    const event = events[currentIndex];
    
    // Check guardrail
    const guardrailCheck = checkGuardrail(event);
    if (!guardrailCheck.allowed) {
      setError(guardrailCheck.reason || 'Guardrail check failed');
      setProcessingMode('NONE');
      setLiveStatus(`🛑 GUARDRAIL BREACH — Stopped at ${event.event_id}`);
      alert(`🛑 ${guardrailCheck.reason}\n\nThis event requires human approval before processing.`);
      return;
    }
    
    setLoading(true);
    setError(null);
    setLiveStatus(`⏳ Processing ${event.event_id} (${currentIndex + 1}/${events.length}) — ${event.event_type}...`);
    const startTime = Date.now();

    try {
      // Refresh active provider state before request
      const currentRequested = await fetchActiveProvider();

      const response = await fetch(`${BACKEND_URL}/process-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const duration = (Date.now() - startTime) / 1000;
      
      // Detection Pattern - Use the fresh value from fetchActiveProvider
      if (result.provider && result.provider !== currentRequested && result.provider !== 'timeout') {
        setFallback({ requested: currentRequested, actual: result.provider });
      }
      
      // Track cancellation for guardrail
      if (event.event_type === 'cancellation_request') {
        setCancellationTimestamps(prev => [...prev, Date.now()]);
      }
      
      setResults(prev => [{ ...result, duration }, ...prev]);
      setProcessedCount(prev => prev + 1);
      setLiveStatus(`✅ ${event.event_id} completed in ${duration.toFixed(1)}s (${result.provider || 'azure'})`);
      
      // Fetch latest audit logs after each event
      fetchAuditLogs();
      
      if (currentIndex < events.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      console.error('Error processing event:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to process event: ${errorMessage}`);
      setProcessingMode('NONE');
      setFailedCount(prev => prev + 1);
      setLiveStatus(`❌ ${event.event_id} FAILED — ${errorMessage.substring(0, 80)}`);
      
      // Add error result
      const duration = (Date.now() - startTime) / 1000;
      setResults(prev => [{
        event_id: event.event_id,
        shipment_id: event.shipment_id,
        timestamp: new Date().toISOString(),
        duration,
        error: errorMessage
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };
  
  const processAll = () => {
    if (processingMode !== 'NONE') return;
    setError(null);
    setTargetIndex(events.length);
    setProcessingMode('ALL');
  };
  
  const quickTest = () => {
    if (processingMode !== 'NONE') return;
    setError(null);
    setTargetIndex(Math.min(currentIndex + 5, events.length));
    setProcessingMode('TEST');
  };
  
  const stopProcessing = () => {
    setProcessingMode('NONE');
  };
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate structure
      if (!Array.isArray(data)) {
        throw new Error('JSON must be an array of events');
      }
      
      if (data.length === 0) {
        throw new Error('JSON array is empty');
      }
      
      // Validate first event has required fields
      const requiredFields = ['event_id', 'shipment_id', 'customer', 'event_type', 'timestamp'];
      const firstEvent = data[0];
      const missingFields = requiredFields.filter(field => !(field in firstEvent));
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Load events
      setEvents(data);
      setCurrentIndex(0);
      setResults([]);
      setCancellationTimestamps([]);
      setAuditLogs([]);
      setProcessingMode('NONE');
      setLiveStatus('');
      setProcessedCount(0);
      setFailedCount(0);
      setError(null);
      
      // Clear backend audit log too
      try { await fetch(`${BACKEND_URL}/audit-log/clear`, { method: 'POST' }); } catch {}
      
      alert(`✅ Successfully loaded ${data.length} events from ${file.name}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid JSON file';
      setUploadError(errorMessage);
      alert(`❌ Upload failed: ${errorMessage}`);
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  const toggleResultExpansion = (index: number) => {
    setExpandedResults(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const currentEvent = events[currentIndex];
  const progressPercent = events.length > 0 ? ((currentIndex + 1) / events.length) * 100 : 0;
  
  // Calculate recent cancellations for display
  const now = Date.now();
  const recentCancellations = cancellationTimestamps.filter(
    t => now - t < 10 * 60 * 1000
  ).length;

  return (
    <div className="max-w-[1920px] mx-auto p-6 space-y-6">
      {/* Error Banner */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <span className="text-red-200">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-red-400" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* File Upload Section */}
      <GlassCard hover={false}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Upload className="w-5 h-5 text-neon-green" />
            <div>
              <h3 className="font-semibold">Upload Custom Events</h3>
              <p className="text-xs text-white/60">Load events from a JSON file</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="px-4 py-2 bg-neon-green/20 border border-neon-green/40 text-neon-green rounded-lg cursor-pointer hover:bg-neon-green/30 transition-all flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Choose File
            </label>
            {uploadError && (
              <span className="text-xs text-red-400">{uploadError}</span>
            )}
          </div>
        </div>
      </GlassCard>
      {/* Stats Dashboard */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          icon={Activity}
          label="Total Events"
          value={stats.total}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="Processed"
          value={stats.processed}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          color="yellow"
        />
        <StatCard
          icon={AlertTriangle}
          label="Critical"
          value={stats.critical}
          color="red"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Time"
          value={`${stats.avgProcessingTime.toFixed(1)}s`}
          color="purple"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-[400px_1fr] gap-6">
        {/* Left Sidebar */}
        <div className="space-y-6">
          {/* Progress Card */}
          <GlassCard hover={false}>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gradient">Processing Progress</h3>
                <span className="text-2xl font-bold text-neon-green">{Math.round(progressPercent)}%</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/60">
                  <span>Event {currentIndex + 1} of {events.length}</span>
                  <span>{events.length - currentIndex - 1} remaining</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-neon-green to-neon-blue relative"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="pt-4 border-t border-white/10">
                <ControlPanel
                  loading={loading}
                  onProcess={processEvent}
                  onProcessAll={processAll}
                  onQuickTest={quickTest}
                  onStop={stopProcessing}
                  hasMore={currentIndex < events.length - 1}
                  isProcessingAll={isProcessingAll}
                />
              </div>
            </div>
          </GlassCard>

          {/* Guardrail Status */}
          <GlassCard hover={false}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-neon-green" />
                <h3 className="text-lg font-semibold">Safety Guardrails</h3>
              </div>
              
              <div className={`p-3 border rounded-xl ${
                guardrailStatus === 'BREACH' 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : guardrailStatus === 'WARNING'
                  ? 'bg-yellow-500/10 border-yellow-500/30'
                  : 'bg-neon-green/10 border-neon-green/30'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Cancellation Limit</span>
                  <span className={`px-2 py-1 text-xs font-bold rounded ${
                    guardrailStatus === 'BREACH'
                      ? 'bg-red-500/20 text-red-400'
                      : guardrailStatus === 'WARNING'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-neon-green/20 text-neon-green'
                  }`}>
                    {guardrailStatus}
                  </span>
                </div>
                <div className="text-xs text-white/60">
                  {recentCancellations} / 3 in last 10 minutes
                </div>
                {guardrailStatus === 'WARNING' && (
                  <div className="mt-2 text-xs text-yellow-400">
                    ⚠️ Approaching limit - next cancellation requires approval
                  </div>
                )}
                {guardrailStatus === 'BREACH' && (
                  <div className="mt-2 text-xs text-red-400">
                    🛑 Limit exceeded - Operations Manager approval required
                  </div>
                )}
              </div>

              <div className="text-xs text-white/50 leading-relaxed">
                <Zap className="w-3 h-3 inline mr-1" />
                Agent must escalate on 3rd cancellation request
              </div>
            </div>
          </GlassCard>

          {/* Event List */}
          <GlassCard hover={false} className="overflow-hidden">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Event Stream
            </h3>
            <div className="max-h-[420px] overflow-y-auto pr-2">
              <EventList
                events={events}
                currentIndex={currentIndex}
                onSelectEvent={setCurrentIndex}
              />
            </div>
          </GlassCard>
        </div>

        {/* Main Content Area */}
        <div className="space-y-6">
          {/* Current Event Details */}
          {currentEvent && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-6 h-6 text-neon-green" />
                <h2 className="text-2xl font-bold text-gradient">Current Event</h2>
              </div>
              <EventDetails event={currentEvent} />
            </div>
          )}

          {/* Processing Results & Live Audit Logs */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Processing Results */}
            <GlassCard hover={false} className="xl:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-neon-green" />
                  Processing Results
                </h3>
                <span className="text-sm text-white/60">{results.length} completed</span>
              </div>
              
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {results.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40">No results yet. Process an event to see results.</p>
                </div>
              ) : (
                results.map((result, index) => {
                  const isExpanded = expandedResults.has(index);
                  const hasError = !!result.error;
                  const provider = result.provider || 'azure';
                  
                  const providerStyles: Record<string, { bg: string; text: string; label: string }> = {
                    azure: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Azure' },
                    gemini: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Gemini' },
                    pai: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'PAI' },
                    timeout: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Timeout' },
                  };
                  const pStyle = providerStyles[provider] || providerStyles.azure;
                  
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-xl border transition-all ${
                        hasError 
                          ? 'bg-red-500/10 border-red-500/30' 
                          : 'bg-black/40 border-white/10 hover:border-neon-green/30'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-bold text-base ${hasError ? 'text-red-400' : 'text-neon-green'}`}>
                              {result.event_id}
                            </span>
                            {!hasError && (
                              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${pStyle.bg} ${pStyle.text} border-current/20`}>
                                {pStyle.label}
                              </span>
                            )}
                            {hasError && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded-full font-bold">
                                ERROR
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-cyan-400/70 mt-1 font-mono">{result.shipment_id}</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="text-[10px] text-white/35 font-mono">
                            {new Date(result.timestamp).toLocaleTimeString()}
                          </div>
                          {result.duration && (
                            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              result.duration < 5 ? 'bg-neon-green/15 text-neon-green' :
                              result.duration < 15 ? 'bg-yellow-500/15 text-yellow-400' :
                              'bg-red-500/15 text-red-400'
                            }`}>
                              {result.duration.toFixed(1)}s
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {hasError ? (
                        <div className="text-sm text-red-300 bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                          ❌ {result.error}
                        </div>
                      ) : (
                        <>
                          {result.agent_response && (
                            <div className="text-sm text-white/75 mb-3 leading-relaxed bg-white/3 p-3 rounded-lg border border-white/5">
                              {isExpanded 
                                ? result.agent_response 
                                : `${result.agent_response.substring(0, 150)}${result.agent_response.length > 150 ? '...' : ''}`
                              }
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <div className="flex items-center gap-3 text-xs flex-wrap">
                              {result.actions_taken !== undefined && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-neon-blue/10 text-neon-blue border border-neon-blue/20">
                                  <Zap className="w-3 h-3" />
                                  {result.actions_taken} actions
                                </div>
                              )}
                              {result.notifications_sent && (
                                <div className="px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  📧 {result.notifications_sent} notifs
                                </div>
                              )}
                              {result.escalated && (
                                <div className="px-2 py-1 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                  ⚠️ Escalated
                                </div>
                              )}
                            </div>
                            
                            {result.agent_response && result.agent_response.length > 150 && (
                              <button
                                onClick={() => toggleResultExpansion(index)}
                                className="flex items-center gap-1 text-xs text-neon-green hover:text-neon-blue transition-colors"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    Less
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    More
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
            </GlassCard>

            {/* Live Audit Logs */}
            <GlassCard hover={false} className="xl:col-span-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <FileText className="w-5 h-5 text-neon-blue" />
                  Live Audit Logs
                </h3>
                <div className="flex items-center gap-3">
                  {processedCount > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-neon-green/20 text-neon-green border border-neon-green/30">
                      ✓ {processedCount} ok
                    </span>
                  )}
                  {failedCount > 0 && (
                    <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      ✗ {failedCount} failed
                    </span>
                  )}
                  <span className="text-sm text-white/60">{auditLogs.length} entries</span>
                </div>
              </div>

              {/* Live Status Banner */}
              {liveStatus && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={`mb-4 px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 ${
                    liveStatus.startsWith('✅') ? 'bg-neon-green/10 border-neon-green/30 text-neon-green' :
                    liveStatus.startsWith('❌') ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                    liveStatus.startsWith('🛑') ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                    'bg-neon-blue/10 border-neon-blue/30 text-neon-blue'
                  }`}
                >
                  {loading && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  )}
                  {liveStatus}
                </motion.div>
              )}
              
              <div ref={auditScrollRef} className="space-y-3 max-h-[600px] overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent' }}>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/40">No logs generated yet.</p>
                    <p className="text-xs text-white/25 mt-1">Logs will appear here as events are processed</p>
                  </div>
                ) : (
                  [...auditLogs].reverse().map((log, i) => {
                    const actionColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
                      'log_decision': { bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-400', icon: '📋' },
                      'notify_customer': { bg: 'bg-neon-green/10', border: 'border-neon-green/25', text: 'text-neon-green', icon: '📧' },
                      'escalate_to_human': { bg: 'bg-orange-500/10', border: 'border-orange-500/25', text: 'text-orange-400', icon: '🚨' },
                      'flag_customs_issue': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/25', text: 'text-yellow-400', icon: '🛃' },
                      'arrange_alternative_routing': { bg: 'bg-purple-500/10', border: 'border-purple-500/25', text: 'text-purple-400', icon: '🔀' },
                      'apply_compensation': { bg: 'bg-emerald-500/10', border: 'border-emerald-500/25', text: 'text-emerald-400', icon: '💰' },
                      'request_cancellation_approval': { bg: 'bg-red-500/10', border: 'border-red-500/25', text: 'text-red-400', icon: '🚫' },
                      'update_eta': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/25', text: 'text-cyan-400', icon: '🕐' },
                      'provider_call': { bg: 'bg-indigo-500/10', border: 'border-indigo-500/25', text: 'text-indigo-400', icon: '🤖' },
                      'query_policy': { bg: 'bg-teal-500/10', border: 'border-teal-500/25', text: 'text-teal-400', icon: '📖' },
                    };
                    const style = actionColors[log.action] || { bg: 'bg-white/5', border: 'border-white/10', text: 'text-white/60', icon: '📝' };

                    const severityColors: Record<string, string> = {
                      'CRITICAL': 'bg-red-500/20 text-red-400 border-red-500/40',
                      'HIGH': 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                      'MEDIUM': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40',
                      'LOW': 'bg-green-500/20 text-green-400 border-green-500/40',
                      'INFO': 'bg-blue-500/20 text-blue-400 border-blue-500/40',
                    };

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.02 }}
                        className={`p-4 rounded-xl border ${style.bg} ${style.border}`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{style.icon}</span>
                            <span className={`text-xs font-bold uppercase tracking-wider ${style.text}`}>
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {log.severity && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${severityColors[log.severity] || 'bg-white/10 text-white/50'}`}>
                                {log.severity}
                              </span>
                            )}
                            <span className="text-[10px] text-white/40">
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {log.event_id && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/40">Event:</span>
                              <span className="text-xs font-semibold text-white">{log.event_id}</span>
                              {log.shipment_id && (
                                <span className="text-xs text-neon-green">({log.shipment_id})</span>
                              )}
                            </div>
                          )}
                          {log.decision && (
                            <div className="text-sm text-white/80">
                              <span className="text-white/40">Decision: </span>{log.decision}
                            </div>
                          )}
                          {log.reasoning && (
                            <div className="text-xs text-white/50 italic mt-1">
                              {log.reasoning}
                            </div>
                          )}
                          {log.message && (
                            <div className="text-sm text-white/70">
                              <span className="text-white/40">Msg: </span>{log.message}
                            </div>
                          )}
                          {log.reason && (
                            <div className="text-sm text-white/70">
                              <span className="text-white/40">Reason: </span>{log.reason}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      <FallbackToast 
        fallback={fallback} 
        onClose={() => setFallback(null)} 
      />
    </div>
  );
}

// Stat Card Component
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: any; 
  label: string; 
  value: string | number; 
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/30 text-blue-400',
    green: 'from-neon-green/20 to-neon-green/5 border-neon-green/30 text-neon-green',
    yellow: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/30 text-yellow-400',
    red: 'from-red-500/20 to-red-500/5 border-red-500/30 text-red-400',
    purple: 'from-purple-500/20 to-purple-500/5 border-purple-500/30 text-purple-400',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      className={`glass rounded-xl p-4 border bg-gradient-to-br ${colorClasses[color]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-xs text-white/60 uppercase tracking-wide">{label}</div>
    </motion.div>
  );
}
