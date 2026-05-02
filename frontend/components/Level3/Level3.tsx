'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from '@/components/GlassCard';
import { Play, Square, Loader2, CheckCircle, AlertTriangle, Clock, Upload, RefreshCw, FileText, Database } from 'lucide-react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

export default function Level3() {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'RUNNING' | 'COMPLETED' | 'CANCELLED'>('IDLE');
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [queue, setQueue] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, any>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === 'RUNNING' && workflowId) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`${BACKEND_URL}/level3/workflow-status/${workflowId}`);
          if (res.ok) {
            const data = await res.json();
            setStatus(data.status);
            setProcessingStatus(data.processing_status);
            
            // If advanced to next shipment
            if (data.current_shipment_index > currentIndex) {
              // Fetch decisions for newly completed
              for (let i = currentIndex; i < data.current_shipment_index; i++) {
                if (queue[i]) fetchDecision(workflowId, queue[i].shipment_id);
              }
              setCurrentIndex(data.current_shipment_index);
              setElapsed(0);
            }
            
            setCurrentNode(data.current_node);
            
            if (data.status === 'COMPLETED' && data.total_shipments > 0) {
               if (queue[data.total_shipments - 1] && !decisions[queue[data.total_shipments - 1].shipment_id]) {
                 fetchDecision(workflowId, queue[data.total_shipments - 1].shipment_id);
               }
            }
          }
        } catch (e) {
          console.error(e);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, workflowId, currentIndex, queue, decisions]);

  useEffect(() => {
     if (status === 'RUNNING') {
       timerRef.current = setInterval(() => {
         setElapsed(p => p + 1);
       }, 1000);
     } else {
       clearInterval(timerRef.current);
     }
     return () => clearInterval(timerRef.current);
  }, [status]);

  const fetchDatasetInfo = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/level3/dataset-info`);
      if (res.ok) {
        const data = await res.json();
        setDatasetInfo(data);
      }
    } catch (e) {
      console.error('Failed to fetch dataset info:', e);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Uploading...');
    setErrorMsg('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${BACKEND_URL}/level3/upload-dataset`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Upload failed');
      }

      const data = await res.json();
      setUploadStatus(`✓ Uploaded: ${data.shipment_count} shipments`);
      await fetchDatasetInfo();
      
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (e: any) {
      setErrorMsg(e.message);
      setUploadStatus('');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetToDefaultDataset = async () => {
    try {
      await fetch(`${BACKEND_URL}/level3/reset-dataset`, { method: 'POST' });
      setUploadStatus('✓ Reset to default dataset');
      await fetchDatasetInfo();
      setTimeout(() => setUploadStatus(''), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDecision = async (wfId: string, shId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/level3/shipment-decision/${wfId}/${shId}`);
      if (res.ok) {
        const data = await res.json();
        setDecisions(prev => ({ ...prev, [shId]: data.decision }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const startWorkflow = async () => {
    try {
      setErrorMsg('');
      setIsStarting(true);
      const res = await fetch(`${BACKEND_URL}/level3/start-workflow`, { method: 'POST' });
      setIsStarting(false);
      if (!res.ok) {
        const err = await res.json();
        setErrorMsg(err.error || 'Failed to start workflow');
        return;
      }
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setQueue(data.queue);
      setStatus('RUNNING');
      setCurrentIndex(0);
      setDecisions({});
      setElapsed(0);
    } catch (e: any) {
      setIsStarting(false);
      setErrorMsg(e.message);
    }
  };

  const cancelWorkflow = async () => {
    if (!workflowId) return;
    try {
      await fetch(`${BACKEND_URL}/level3/workflow-cancel/${workflowId}`, { method: 'POST' });
      setStatus('CANCELLED');
    } catch (e) {
      console.error(e);
    }
  };

  const progressPct = queue.length > 0 ? (currentIndex / queue.length) * 100 : 0;

  return (
    <div className="max-w-[1600px] mx-auto px-8 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-green to-neon-blue">
            Route Optimizer
          </h2>
          <p className="text-white/60 mt-2">Stateful multi-crisis decision workflow (LangGraph)</p>
        </div>
        
        <div className="flex gap-4">
          {status !== 'RUNNING' ? (
            <button
              onClick={startWorkflow}
              disabled={isStarting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-neon-green/20 text-neon-green border border-neon-green/50 hover:bg-neon-green/30 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
              {status === 'IDLE' ? (isStarting ? 'Starting...' : 'Start Workflow') : (isStarting ? 'Starting...' : 'Restart Workflow')}
            </button>
          ) : (
            <button
              onClick={cancelWorkflow}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30 transition-all font-semibold"
            >
              <Square className="w-5 h-5" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Dataset Info & Upload Section */}
      <GlassCard>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Database className="w-5 h-5 text-neon-blue" />
              <h3 className="text-lg font-semibold">Dataset</h3>
            </div>
            {datasetInfo ? (
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-white/40" />
                  <span className="text-white/60">
                    {datasetInfo.is_custom ? 'Custom Dataset' : 'Default Dataset'}
                  </span>
                  {datasetInfo.is_custom && (
                    <span className="px-2 py-0.5 bg-neon-green/20 text-neon-green text-xs rounded-full border border-neon-green/30">
                      CUSTOM
                    </span>
                  )}
                </div>
                <div className="text-white/80 font-mono text-xs">
                  {datasetInfo.shipment_count} shipments · {datasetInfo.disruption_count} disruptions · {datasetInfo.alternative_count} alternatives
                </div>
              </div>
            ) : (
              <div className="text-white/40 text-sm">Loading dataset info...</div>
            )}
            {uploadStatus && (
              <div className="mt-2 text-sm text-neon-green">{uploadStatus}</div>
            )}
          </div>

          <div className="flex gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileUpload}
              className="hidden"
              id="dataset-upload"
              disabled={status === 'RUNNING'}
            />
            <label
              htmlFor="dataset-upload"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                status === 'RUNNING'
                  ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-neon-blue/20 border-neon-blue/40 text-neon-blue hover:bg-neon-blue/30 cursor-pointer'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload Custom Dataset
            </label>
            
            {datasetInfo?.is_custom && (
              <button
                onClick={resetToDefaultDataset}
                disabled={status === 'RUNNING'}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  status === 'RUNNING'
                    ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                Reset to Default
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {errorMsg && (
        <GlassCard className="border-red-500/50 bg-red-500/10">
          <p className="text-red-400 font-semibold">{errorMsg}</p>
        </GlassCard>
      )}

      {status !== 'IDLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress / Status Panel */}
          <GlassCard className="col-span-1 lg:col-span-3 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {status === 'RUNNING' && <Loader2 className="w-5 h-5 animate-spin text-neon-blue" />}
                {status === 'COMPLETED' && <CheckCircle className="w-5 h-5 text-neon-green" />}
                {status === 'CANCELLED' && <AlertTriangle className="w-5 h-5 text-yellow-400" />}
                Workflow Status: {status}
              </h3>
              <span className="text-white/60 font-mono">
                {currentIndex} / {queue.length} Processed
              </span>
            </div>
            
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5 relative">
              <motion.div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-neon-green to-neon-blue"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>

            {status === 'RUNNING' && (
              <div className="flex justify-between text-sm mt-4 text-white/80 bg-black/20 p-4 rounded-xl border border-white/5">
                <div>
                  <span className="font-semibold text-neon-blue">Current Node:</span> {currentNode || 'Initializing...'}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{elapsed}s</span>
                  {elapsed > 30 && <span className="text-yellow-400 ml-2">API response slow...</span>}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Shipment Queue / Decisions */}
          <div className="col-span-1 lg:col-span-3">
            <h3 className="text-xl font-bold text-white mb-4">Shipment Processing Queue</h3>
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {queue.map((shipment, idx) => {
                  const shipmentId = shipment?.shipment_id || `shipment-${idx}`;
                  const isCurrent = status === 'RUNNING' && idx === currentIndex;
                  const isProcessed = idx < currentIndex || status === 'COMPLETED';
                  const dec = decisions[shipmentId];
                  
                  let borderClass = 'border-white/5';
                  let bgClass = 'bg-black/20';
                  
                  if (isCurrent) {
                    borderClass = 'border-neon-green/50 shadow-[0_0_15px_rgba(57,255,20,0.2)]';
                    bgClass = 'bg-neon-green/5';
                  } else if (isProcessed && dec) {
                    if (dec.outcome === 'ESCALATED') {
                      borderClass = 'border-red-500/50';
                      bgClass = 'bg-red-500/10';
                    } else if (dec.outcome === 'REROUTED_RELAXED') {
                      borderClass = 'border-yellow-400/50';
                      bgClass = 'bg-yellow-400/10';
                    } else if (dec.outcome === 'NO_ACTION_NEEDED') {
                      borderClass = 'border-teal-400/50';
                      bgClass = 'bg-teal-400/10';
                    } else {
                      borderClass = 'border-neon-blue/50';
                      bgClass = 'bg-neon-blue/10';
                    }
                  }

                  return (
                    <motion.div
                      key={shipmentId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`rounded-xl p-5 border backdrop-blur-md transition-all duration-300 ${borderClass} ${bgClass}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-sm px-2 py-1 bg-black/40 rounded text-white/80 border border-white/10">
                              {shipmentId}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                              shipment.tier === 'Platinum' ? 'bg-purple-500/20 text-purple-300' :
                              shipment.tier === 'Gold' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-gray-500/20 text-gray-300'
                            }`}>
                              {shipment.tier || 'Standard'}
                            </span>
                            <span className="text-sm text-white/60 capitalize">
                              {shipment.status ? shipment.status.replace('_', ' ') : 'unknown'}
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-white">{shipment.customer || 'Unknown Customer'}</div>
                          <div className="text-sm text-white/60 mb-1">{shipment.cargo_type || 'General Cargo'}</div>
                          {(shipment.origin || shipment.destination) && (
                            <div className="flex items-center gap-2 text-xs text-white/50">
                              <span className="font-medium">{shipment.origin || 'Unknown'}</span>
                              <span>→</span>
                              <span className="font-medium">{shipment.destination || 'Unknown'}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex-1 md:text-right">
                          {isCurrent ? (
                            <div className="flex items-center md:justify-end gap-2 text-neon-green font-mono text-sm animate-pulse">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              PROCESSING...
                            </div>
                          ) : dec ? (
                            <div className="space-y-1">
                              <div className="flex items-center md:justify-end gap-2 flex-wrap">
                                <div className={`font-bold ${
                                  dec.outcome === 'ESCALATED' ? 'text-red-400' :
                                  dec.outcome === 'REROUTED_RELAXED' ? 'text-yellow-400' :
                                  dec.outcome === 'NO_ACTION_NEEDED' ? 'text-teal-400' :
                                  'text-neon-blue'
                                }`}>
                                  {dec.outcome === 'NO_ACTION_NEEDED' ? 'NO ACTION REQUIRED' : dec.outcome ? dec.outcome.replace(/_/g, ' ') : 'PROCESSED'}
                                </div>
                                {dec.provider && (
                                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                                    dec.provider === 'azure' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                                    dec.provider === 'gemini' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
                                    'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                  }`}>
                                    {dec.provider === 'azure' ? 'Azure' : dec.provider === 'gemini' ? 'Gemini' : 'PAI'}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-white/80 max-w-md md:ml-auto">
                                {dec.reasoning || dec.llm_rationale || 'Processing completed'}
                              </div>
                              {dec.duration != null && (
                                <div className="text-xs text-white/50 md:text-right">
                                  Processed in {parseFloat(dec.duration).toFixed(1)}s
                                </div>
                              )}
                            </div>
                          ) : isProcessed ? (
                            <div className="text-white/40 text-sm">Waiting for result...</div>
                          ) : (
                            <div className="text-white/40 text-sm font-mono">QUEUED</div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
