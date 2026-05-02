'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, FileText, Upload, Trash2, X, CheckCircle, AlertCircle } from 'lucide-react';
import GlassCard from '../GlassCard';
import ChatContainer from './ChatContainer';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5001';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  sources?: any[];
}

interface Document {
  filename: string;
  name: string;
  is_default: boolean;
  chunks?: number;
}

const SAMPLE_QUERIES = [
  "What's the transit time from Mumbai to Hamburg for a Platinum shipment, including customs?",
  "A Gold customer's shipment is 15 hours late. What compensation applies and what must we do?",
  "Can our agent autonomously cancel 5 shipments in a row?",
  "What is the HS code and import duty for mobile phones?",
  "What is the weather in Mumbai today?",
];

export default function Level1() {
  const [messages, setMessages] = useState<Message[]>([
    {
      type: 'assistant',
      content: "Hello! I'm the GlobalFreight Shipment Assistant. I answer questions grounded strictly in your policy documents — SLA tiers, customs tariffs, and delay handling rules.\n\nTry one of the sample queries below, or type your own.",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [showDocModal, setShowDocModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (showDocModal) {
      loadDocuments();
    }
  }, [showDocModal]);

  const loadDocuments = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/documents`);
      const data = await response.json();
      if (data.documents) {
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      setUploadStatus({ type: 'error', message: 'Failed to load documents' });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) {
      setUploadStatus({ type: 'error', message: 'Only .md and .txt files are supported' });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const content = await file.text();
      const displayName = file.name.replace(/\.(md|txt)$/i, '').replace(/[-_]/g, ' ');

      const response = await fetch(`${BACKEND_URL}/documents/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          name: displayName,
          content: content,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully added ${data.chunks_added} chunks from ${file.name}` 
        });
        loadDocuments();
        // Clear the input
        event.target.value = '';
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Failed to upload document' });
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus({ type: 'error', message: 'Failed to upload document. Ensure backend is running.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (filename: string, isDefault: boolean) => {
    if (isDefault) {
      setUploadStatus({ type: 'error', message: 'Cannot delete default documents' });
      return;
    }

    if (!confirm(`Are you sure you want to delete ${filename}?`)) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/documents/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ 
          type: 'success', 
          message: `Successfully removed ${data.chunks_removed} chunks from ${filename}` 
        });
        loadDocuments();
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Failed to delete document' });
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadStatus({ type: 'error', message: 'Failed to delete document' });
    }
  };

  const handleResetDocuments = async () => {
    if (!confirm('Reset to default documents? This will remove all custom documents.')) {
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/documents/reset`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok) {
        setUploadStatus({ type: 'success', message: 'Successfully reset to default documents' });
        loadDocuments();
      } else {
        setUploadStatus({ type: 'error', message: data.error || 'Failed to reset documents' });
      }
    } catch (error) {
      console.error('Error resetting documents:', error);
      setUploadStatus({ type: 'error', message: 'Failed to reset documents' });
    }
  };

  const handleSend = async (query?: string) => {
    const message = query || input.trim();
    if (!message) return;

    setMessages(prev => [...prev, { type: 'user', content: message }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message }),
      });

      if (!response.ok) throw new Error('Backend request failed');

      const data = await response.json();
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: data.answer,
        sources: data.sources,
      }]);
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please ensure the backend is running.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-8 space-y-6">
      {/* Document Status */}
      <GlassCard>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div className="flex gap-2 flex-wrap">
            {['DOC1 — Carrier SLA', 'DOC2 — Customs Tariff', 'DOC3 — Delay Policy'].map((doc) => (
              <span
                key={doc}
                className="px-4 py-2 rounded-full bg-neon-green/10 border border-neon-green/30 text-neon-green text-sm font-medium"
              >
                {doc}
              </span>
            ))}
          </div>
          <motion.button
            onClick={() => setShowDocModal(true)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-neon-green to-neon-blue text-black font-semibold shadow-neon-green flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Manage Documents
          </motion.button>
        </div>
      </GlassCard>

      {/* Chat */}
      <ChatContainer messages={messages} loading={loading} />

      {/* Sample Queries */}
      <GlassCard>
        <h3 className="text-sm uppercase tracking-wider text-white/60 mb-4">Sample queries:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_QUERIES.map((query, index) => (
            <motion.button
              key={index}
              onClick={() => !loading && handleSend(query)}
              whileHover={!loading ? { scale: 1.02, y: -2 } : {}}
              whileTap={!loading ? { scale: 0.98 } : {}}
              disabled={loading}
              className={`p-4 glass-light rounded-xl text-left text-sm text-white/80 hover:text-white hover:border-neon-green/50 border border-white/5 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {query}
            </motion.button>
          ))}
        </div>
      </GlassCard>

      {/* Input */}
      <GlassCard>
        <div className="flex gap-4 items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder="Ask about transit times, compensation, HS codes, or delay policies..."
            className="flex-1 px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-neon-green/50 focus:shadow-neon-green transition-all"
            disabled={loading}
          />
          <motion.button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-neon-green to-neon-blue text-black font-semibold shadow-neon-green flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            Send
          </motion.button>
        </div>
      </GlassCard>

      {/* Document Management Modal */}
      <AnimatePresence>
        {showDocModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowDocModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="glass rounded-2xl p-6 max-w-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gradient">Manage Documents</h2>
                  <p className="text-sm text-white/60 mt-1">
                    {documents.length} document{documents.length !== 1 ? 's' : ''} loaded
                  </p>
                </div>
                <button
                  onClick={() => setShowDocModal(false)}
                  className="text-white/60 hover:text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Status Messages */}
              <AnimatePresence>
                {uploadStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`mb-4 p-4 rounded-xl border flex items-start gap-3 ${
                      uploadStatus.type === 'success'
                        ? 'bg-neon-green/10 border-neon-green/30 text-neon-green'
                        : 'bg-red-500/10 border-red-500/30 text-red-400'
                    }`}
                  >
                    {uploadStatus.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{uploadStatus.message}</p>
                    </div>
                    <button
                      onClick={() => setUploadStatus(null)}
                      className="text-current opacity-60 hover:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Upload Section */}
              <div className="mb-6 p-5 bg-gradient-to-br from-neon-green/10 to-neon-blue/10 border border-neon-green/30 rounded-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-green to-neon-blue flex items-center justify-center flex-shrink-0">
                    <Upload className="w-6 h-6 text-black" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2">Upload New Document</h3>
                    <p className="text-sm text-white/60 mb-4">
                      Add .md or .txt files to expand the knowledge base
                    </p>
                    <label className="block">
                      <input
                        type="file"
                        accept=".md,.txt"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={`px-6 py-3 rounded-xl bg-gradient-to-r from-neon-green to-neon-blue text-black font-semibold text-center cursor-pointer ${
                          uploading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {uploading ? 'Uploading...' : 'Choose File'}
                      </motion.div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Current Documents */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Current Documents
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {documents.length === 0 ? (
                    <div className="text-center py-8 text-white/40">
                      <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No documents loaded</p>
                    </div>
                  ) : (
                    documents.map((doc) => (
                      <motion.div
                        key={doc.filename}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/10 hover:border-neon-green/30 transition-all group"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{doc.name}</span>
                            {doc.is_default && (
                              <span className="px-2 py-0.5 bg-neon-blue/20 text-neon-blue text-xs rounded border border-neon-blue/30">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-white/50">
                            {doc.filename}
                            {doc.chunks && ` • ${doc.chunks} chunks`}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteDocument(doc.filename, doc.is_default)}
                          disabled={doc.is_default}
                          className={`p-2 rounded-lg transition-all ${
                            doc.is_default
                              ? 'text-white/20 cursor-not-allowed'
                              : 'text-white/40 hover:text-red-400 hover:bg-red-500/10'
                          }`}
                          title={doc.is_default ? 'Cannot delete default documents' : 'Delete document'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-white/10">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleResetDocuments}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-medium hover:bg-red-500/30 transition-all"
                >
                  Reset to Defaults
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowDocModal(false)}
                  className="flex-1 px-4 py-3 rounded-xl glass-light border border-white/10 hover:border-neon-green/50 text-white font-medium transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
