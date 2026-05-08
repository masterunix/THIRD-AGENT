"""
GlobalFreight AI Platform - Combined Backend
Supports both Level 1 (RAG Assistant) and Level 2 (Exception Handler)
Version: 2.0-combined
"""

__version__ = "2.0-combined"

import os
import json
import requests as http_requests
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# LangChain imports
from langchain_openai import AzureChatOpenAI
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Agent imports (Level 2)
from langchain_classic.agents import AgentExecutor, create_tool_calling_agent
from langchain_core.tools import tool

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

from level3_optimizer import level3_bp, setup_level3
app.register_blueprint(level3_bp, url_prefix='/level3')

# Configuration
AZURE_OPENAI_API_KEY = os.getenv('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_OPENAI_ENDPOINT', 'https://ai-fortnight.cognitiveservices.azure.com/')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_OPENAI_DEPLOYMENT', 'gpt-5-nano')
AZURE_OPENAI_API_VERSION = os.getenv('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
PAI_API_KEY = os.getenv('PAI_API_KEY', '')

# Available providers
PROVIDERS = ['azure', 'gemini', 'pai']

if not AZURE_OPENAI_API_KEY:
    raise ValueError("AZURE_OPENAI_API_KEY not found in environment variables")

# Initialize embeddings and LLM
print("Initializing embeddings...")
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

llm = AzureChatOpenAI(
    azure_deployment=AZURE_OPENAI_DEPLOYMENT,
    openai_api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_key=AZURE_OPENAI_API_KEY,
    temperature=1,  # gpt-5-nano only supports temperature=1
    request_timeout=45,
    max_retries=1
)

# Global state
vectorstore = None
qa_chain = None
retriever = None
agent_executor = None
audit_log = []
cancellation_tracker = []
shipment_context = {}
query_cache = {}
active_provider = 'azure'  # 'azure' | 'gemini' | 'pai'

# ============================================================================
# LLM WRAPPER WITH FALLBACK
# ============================================================================

def call_llm(prompt: str, system_prompt: str = "", requested_provider: str = None) -> tuple[str, str]:
    """
    Unified LLM call with fallback logic.
    Returns (response_text, provider_used)
    """
    global active_provider
    
    # Use requested provider or global active provider
    start_provider = requested_provider if requested_provider in PROVIDERS else active_provider
    
    # Reorder providers to start with the requested one
    providers_list = [start_provider] + [p for p in PROVIDERS if p != start_provider]
    
    for provider in providers_list:
        try:
            result = ""
            if provider == 'azure':
                # Azure/LangChain logic
                from langchain_core.messages import SystemMessage, HumanMessage
                messages = []
                if system_prompt:
                    messages.append(SystemMessage(content=system_prompt))
                messages.append(HumanMessage(content=prompt))
                response = llm.invoke(messages)
                result = response.content
            elif provider == 'gemini':
                result = _try_gemini(system_prompt, prompt, "CALL")
            elif provider == 'pai':
                result = _try_pai(system_prompt, prompt, "CALL")
            
            if result:
                return result, provider
        except Exception as e:
            print(f"Provider {provider} failed: {e}")
            continue
            
    return "All AI providers are currently unavailable. Please try again later.", "timeout"

# ============================================================================
# LEVEL 1: RAG ASSISTANT
# ============================================================================

def load_documents():
    """Load policy documents"""
    documents = []
    doc_files = [
        ('data/DOC1-carrier-sla-agreement.md', 'Carrier SLA Agreement'),
        ('data/DOC2-customs-tariff-reference.md', 'Customs Tariff Reference'),
        ('data/DOC3-shipment-delay-policy.md', 'Shipment Delay Policy')
    ]
    
    for filename, doc_name in doc_files:
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
                documents.append({
                    'content': content,
                    'metadata': {
                        'source': filename,
                        'document_name': doc_name
                    }
                })
        except FileNotFoundError:
            print(f"Warning: {filename} not found")
    
    return documents

def create_vectorstore():
    """Create vectorstore from documents"""
    print("Loading documents...")
    documents = load_documents()
    
    if not documents:
        raise ValueError("No documents loaded")
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=100,
        length_function=len,
    )
    
    texts = []
    metadatas = []
    
    for doc in documents:
        chunks = text_splitter.split_text(doc['content'])
        texts.extend(chunks)
        metadatas.extend([doc['metadata']] * len(chunks))
    
    print(f"Created {len(texts)} chunks from {len(documents)} documents")
    
    vectorstore = Chroma.from_texts(
        texts=texts,
        embedding=embeddings,
        metadatas=metadatas,
        collection_name="globalfreight_docs"
    )
    
    print("Vectorstore created")
    return vectorstore

def create_qa_chain(vectorstore):
    """Create QA chain for Level 1"""
    template = """You are the GlobalFreight Shipment Assistant. Answer ONLY from the context below.

RULES:
1. Answer ONLY from provided context
2. If question is out-of-scope, respond: "I can only answer questions about GlobalFreight policies."
3. Be precise and concise
4. Never hallucinate

Context:
{context}

Question: {question}

Answer:"""

    prompt = ChatPromptTemplate.from_template(template)
    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})
    
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)
    
    rag_chain = (
        {"context": retriever | format_docs, "question": RunnablePassthrough()}
        | prompt
        | llm
        | StrOutputParser()
    )
    
    return rag_chain, retriever

# ============================================================================
# LEVEL 2: EXCEPTION HANDLER AGENT TOOLS
# ============================================================================

@tool
def query_policy(question: str) -> str:
    """Query policy documents for specific information."""
    global vectorstore
    if vectorstore is None:
        return "Error: Policy documents not loaded"
    try:
        retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
        docs = retriever.invoke(question)
        if not docs:
            return "No relevant policy information found"
        context = "\n\n".join([doc.page_content for doc in docs])
        return f"Policy Information:\n{context}"
    except Exception as e:
        return f"Error querying policy: {str(e)}"

@tool
def notify_customer(shipment_id: str, customer: str, message: str, urgency: str = "normal") -> str:
    """Send notification to customer."""
    audit_log.append({
        'action': 'notify_customer',
        'shipment_id': shipment_id,
        'customer': customer,
        'message': message,
        'urgency': urgency,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Customer notification sent to {customer} for {shipment_id}"

@tool
def escalate_to_human(shipment_id: str, reason: str, escalation_target: str, priority: str = "normal") -> str:
    """Escalate event to human operator."""
    audit_log.append({
        'action': 'escalate_to_human',
        'shipment_id': shipment_id,
        'reason': reason,
        'escalation_target': escalation_target,
        'priority': priority,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Escalated {shipment_id} to {escalation_target}"

@tool
def flag_customs_issue(shipment_id: str, issue_type: str, corrective_action: str) -> str:
    """Flag a customs-related issue."""
    audit_log.append({
        'action': 'flag_customs_issue',
        'shipment_id': shipment_id,
        'issue_type': issue_type,
        'corrective_action': corrective_action,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Customs issue flagged for {shipment_id}"

@tool
def arrange_alternative_routing(shipment_id: str, reason: str, estimated_delay_reduction: str) -> str:
    """Arrange alternative routing."""
    audit_log.append({
        'action': 'arrange_alternative_routing',
        'shipment_id': shipment_id,
        'reason': reason,
        'estimated_delay_reduction': estimated_delay_reduction,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Alternative routing arranged for {shipment_id}"

@tool
def apply_compensation(shipment_id: str, customer: str, compensation_type: str, amount: str, reason: str) -> str:
    """Apply compensation to customer."""
    audit_log.append({
        'action': 'apply_compensation',
        'shipment_id': shipment_id,
        'customer': customer,
        'compensation_type': compensation_type,
        'amount': amount,
        'reason': reason,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Compensation applied for {shipment_id}"

@tool
def request_cancellation_approval(shipment_id: str, customer: str, reason: str, cancellation_number: int) -> str:
    """Request approval for shipment cancellation."""
    global cancellation_tracker
    now = datetime.now()
    ten_minutes_ago = now - timedelta(minutes=10)
    cancellation_tracker = [c for c in cancellation_tracker if c['timestamp'] > ten_minutes_ago]
    recent_count = len(cancellation_tracker)
    
    audit_log.append({
        'action': 'request_cancellation_approval',
        'shipment_id': shipment_id,
        'customer': customer,
        'reason': reason,
        'cancellation_number': cancellation_number,
        'recent_cancellations_count': recent_count,
        'guardrail_status': 'BREACH' if recent_count >= 3 else 'OK',
        'timestamp': now.isoformat()
    })
    
    if recent_count >= 3:
        return f"⚠️ GUARDRAIL BREACH: {recent_count} cancellations in last 10 minutes. Requires Operations Manager approval."
    else:
        cancellation_tracker.append({'shipment_id': shipment_id, 'timestamp': now})
        return f"✓ Cancellation approved for {shipment_id}"

@tool
def update_eta(shipment_id: str, new_eta: str, reason: str) -> str:
    """Update estimated time of arrival."""
    audit_log.append({
        'action': 'update_eta',
        'shipment_id': shipment_id,
        'new_eta': new_eta,
        'reason': reason,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ ETA updated for {shipment_id}"

@tool
def get_shipment_history(shipment_id: str) -> str:
    """Retrieve previous events for a shipment."""
    global shipment_context
    if shipment_id not in shipment_context:
        return f"No previous events found for {shipment_id}"
    history = shipment_context[shipment_id]
    return f"Previous events for {shipment_id}:\n" + json.dumps(history, indent=2)

@tool
def log_decision(event_id: str, decision: str, reasoning: str, severity: str) -> str:
    """Log a decision for audit trail."""
    audit_log.append({
        'action': 'log_decision',
        'event_id': event_id,
        'decision': decision,
        'reasoning': reasoning,
        'severity': severity,
        'timestamp': datetime.now().isoformat()
    })
    return f"✓ Decision logged for {event_id}"

def create_exception_agent():
    """Create the exception handling agent for Level 2"""
    tools = [
        query_policy, notify_customer, escalate_to_human, flag_customs_issue,
        arrange_alternative_routing, apply_compensation, request_cancellation_approval,
        update_eta, get_shipment_history, log_decision
    ]
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", """You are the GlobalFreight Exception Handler AI Agent. Process events quickly and safely.

WORKFLOW:
1. Assess severity: CRITICAL | HIGH | MEDIUM | LOW
2. Decide action and call appropriate tools IMMEDIATELY.
3. Call log_decision tool last.

CRITICAL GUARDRAIL: Max 3 cancellations per 10 minutes

ESCALATE: Pharma/medical >2h, Perishables >4h, Cancellations, Regulatory issues
AUTO-RESOLVE: Minor delays, Routine updates, Standard compensation

CRITICAL OPTIMIZATION: You must process this event in EXACTLY ONE turn. Make all necessary tool calls simultaneously, then provide your final concise response immediately."""),
        MessagesPlaceholder(variable_name="chat_history", optional=True),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad")
    ])
    
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=False,
        max_iterations=3, # Reduced to force faster completion
        handle_parsing_errors=True,
        return_intermediate_steps=False,
        max_execution_time=20 # Reduced from 40 to fail-fast
    )
    
    return agent_executor

# ============================================================================
# INITIALIZE
# ============================================================================

print("Initializing GlobalFreight AI Platform...")
vectorstore = create_vectorstore()
qa_chain, retriever = create_qa_chain(vectorstore)
agent_executor = create_exception_agent()
setup_level3(vectorstore, llm)
print("Platform ready!")

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'version': __version__,
        'documents_loaded': 3,
        'tools_available': 10,
        'vectorstore_initialized': vectorstore is not None,
        'agent_initialized': agent_executor is not None
    })

# LEVEL 1 ENDPOINTS

@app.route('/query', methods=['POST'])
def query():
    """Level 1: RAG query endpoint — respects active_provider"""
    try:
        data = request.json
        question = data.get('question', '').strip()
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        # Always use vectorstore for retrieval
        source_docs = retriever.invoke(question)
        context = "\n\n".join(doc.page_content for doc in source_docs)
        
        sources = []
        seen = set()
        for doc in source_docs:
            doc_name = doc.metadata.get('document_name', 'Unknown')
            if doc_name not in seen:
                seen.add(doc_name)
                sources.append({
                    'document': doc_name,
                    'source': doc.metadata.get('source', 'Unknown')
                })
        
        rag_system_prompt = f"""You are the GlobalFreight Shipment Assistant. Answer ONLY from the context below.

RULES:
1. Answer ONLY from provided context
2. If the answer is not in the context, respond: "I can only answer questions about GlobalFreight policies, tariffs, and operational procedures."
3. Be precise and concise
4. Never hallucinate

Context:
{context}"""

        answer, provider_used = call_llm(f"Question: {question}\n\nAnswer:", rag_system_prompt)
        
        return jsonify({
            'answer': answer,
            'sources': sources[:3],
            'provider': provider_used
        })
    except Exception as e:
        print(f"Error processing query: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/documents', methods=['GET'])
def get_documents():
    """Get list of loaded documents"""
    global vectorstore
    if vectorstore is None:
        return jsonify({'documents': []})
    try:
        collection = vectorstore._collection
        all_metadata = collection.get()['metadatas']
        docs = {}
        for meta in all_metadata:
            source = meta.get('source', 'Unknown')
            doc_name = meta.get('document_name', 'Unknown')
            if source not in docs:
                docs[source] = {
                    'filename': source,
                    'name': doc_name,
                    'is_default': source in ['data/DOC1-carrier-sla-agreement.md', 'data/DOC2-customs-tariff-reference.md', 'data/DOC3-shipment-delay-policy.md']
                }
        return jsonify({'documents': list(docs.values())})
    except Exception as e:
        print(f"Error getting documents: {str(e)}")
        return jsonify({'error': 'Failed to get documents'}), 500

@app.route('/documents/add', methods=['POST'])
def add_document():
    """Add document to vectorstore"""
    global vectorstore
    try:
        data = request.json
        filename = data.get('filename', '').strip()
        doc_name = data.get('name', '').strip()
        content = data.get('content', '').strip()
        
        if not filename or not content:
            return jsonify({'error': 'Filename and content required'}), 400
        
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=100)
        chunks = text_splitter.split_text(content)
        metadatas = [{'source': filename, 'document_name': doc_name or filename}] * len(chunks)
        vectorstore.add_texts(texts=chunks, metadatas=metadatas)
        query_cache.clear()
        
        return jsonify({'success': True, 'chunks_added': len(chunks)})
    except Exception as e:
        print(f"Error adding document: {str(e)}")
        return jsonify({'error': 'Failed to add document'}), 500

@app.route('/documents/remove', methods=['POST'])
def remove_document():
    """Remove document from vectorstore"""
    global vectorstore
    try:
        data = request.json
        filename = data.get('filename', '').strip()
        if not filename:
            return jsonify({'error': 'Filename required'}), 400
        
        default_docs = ['data/DOC1-carrier-sla-agreement.md', 'data/DOC2-customs-tariff-reference.md', 'data/DOC3-shipment-delay-policy.md']
        if filename in default_docs:
            return jsonify({'error': 'Cannot remove default documents'}), 400
        
        collection = vectorstore._collection
        results = collection.get(where={"source": filename})
        if not results['ids']:
            return jsonify({'error': f'Document {filename} not found'}), 404
        
        collection.delete(ids=results['ids'])
        query_cache.clear()
        
        return jsonify({'success': True, 'chunks_removed': len(results['ids'])})
    except Exception as e:
        print(f"Error removing document: {str(e)}")
        return jsonify({'error': 'Failed to remove document'}), 500

@app.route('/documents/reset', methods=['POST'])
def reset_documents():
    """Reset to default documents"""
    global vectorstore, qa_chain, retriever
    try:
        vectorstore = create_vectorstore()
        qa_chain, retriever = create_qa_chain(vectorstore)
        query_cache.clear()
        return jsonify({'success': True})
    except Exception as e:
        print(f"Error resetting documents: {str(e)}")
        return jsonify({'error': 'Failed to reset documents'}), 500

# LEVEL 2 ENDPOINTS

@app.route('/process-event', methods=['POST'])
def process_event():
    """Level 2: Process exception event"""
    global shipment_context
    try:
        event = request.json
        if not event:
            return jsonify({'error': 'Event data required'}), 400
        
        event_id = event.get('event_id', 'UNKNOWN')
        shipment_id = event.get('shipment_id', 'UNKNOWN')
        
        if shipment_id not in shipment_context:
            shipment_context[shipment_id] = []
        shipment_context[shipment_id].append(event)
        
        event_description = f"""
EVENT: {event_id} | SHIPMENT: {shipment_id}
CUSTOMER: {event.get('customer')} ({event.get('customer_tier')})
ROUTE: {event.get('origin')} → {event.get('destination')}
CARRIER: {event.get('carrier')}

TYPE: {event.get('event_type')}
DELAY: {event.get('delay_hours', 'N/A')}h | REASON: {event.get('reason_code', 'N/A')}
CARGO: {event.get('cargo_type')} | VALUE: ${event.get('cargo_value_usd', 0):,}

DESCRIPTION: {event.get('description')}
{f"NOTES: {event.get('notes')}" if event.get('notes') else ""}

TASK: Assess, decide, act. Be efficient.
"""
        
        start_time = datetime.now()
        agent_response = ""
        provider_used = active_provider
        
        system_prompt = """You are the GlobalFreight Exception Handler AI Agent. Process this logistics event.

For each event:
1. Assess severity: CRITICAL | HIGH | MEDIUM | LOW
2. Decide action: auto-resolve OR escalate to human
3. Take action: notify customer, flag customs, arrange routing, escalate
4. Log your decision with reasoning

CRITICAL GUARDRAIL: Max 3 cancellations per 10 minutes. On the 3rd, STOP and escalate.
ESCALATE: Pharma/medical >2h, Perishables >4h, Cancellation requests, Regulatory issues
AUTO-RESOLVE: Minor delays <2h, Routine updates, Standard compensation

Respond concisely with: SEVERITY | ACTION TAKEN | REASONING"""

        # For Level 2, we prefer the LangChain Agent if Azure is active and working
        # because it has tool-calling capabilities.
        agent_response = ""
        provider_used = ""

        if active_provider == 'azure':
            try:
                result = agent_executor.invoke({"input": event_description})
                agent_response = result['output']
                provider_used = 'azure'
            except Exception as azure_err:
                print(f"Azure Agent failed: {azure_err}")
                # Fallback to pure LLM calls (non-agentic)
                agent_response, provider_used = call_llm(event_description, system_prompt)
        else:
            # Direct LLM call for non-azure providers (they don't have the agent tools bound in this setup)
            agent_response, provider_used = call_llm(event_description, system_prompt)

        duration = (datetime.now() - start_time).total_seconds()
        
        # Auto-log the decision if not using the agent (which logs via tools)
        if provider_used != 'azure':
            audit_log.append({
                'action': 'log_decision',
                'event_id': event_id,
                'decision': f'Processed via {provider_used}',
                'reasoning': f'Provider: {provider_used} | Duration: {duration:.1f}s',
                'severity': 'MEDIUM',
                'timestamp': datetime.now().isoformat()
            })
        
        return jsonify({
            'event_id': event_id,
            'shipment_id': shipment_id,
            'agent_response': agent_response,
            'actions_taken': len([log for log in audit_log if log.get('action') != 'log_decision']),
            'duration': f"{duration:.1f}",
            'timestamp': datetime.now().isoformat(),
            'provider': provider_used
        })
    except Exception as e:
        print(f"Error processing event: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/set-provider', methods=['POST'])
def set_provider():
    """Switch the active LLM provider"""
    global active_provider
    data = request.json
    provider = data.get('provider', 'azure')
    if provider not in ('azure', 'gemini', 'pai'):
        return jsonify({'error': f'Invalid provider: {provider}'}), 400
    active_provider = provider
    print(f"Switched active provider to: {provider}")
    return jsonify({'success': True, 'active_provider': active_provider})

@app.route('/get-provider', methods=['GET'])
def get_provider():
    """Get the active LLM provider"""
    return jsonify({
        'active_provider': active_provider,
        'available': {
            'azure': bool(AZURE_OPENAI_API_KEY),
            'gemini': bool(GEMINI_API_KEY),
            'pai': bool(PAI_API_KEY)
        }
    })

@app.route('/audit-log', methods=['GET'])
def get_audit_log():
    """Get audit log"""
    return jsonify({'audit_log': audit_log, 'total_entries': len(audit_log)})

@app.route('/audit-log/clear', methods=['POST'])
def clear_audit_log():
    """Clear audit log"""
    global audit_log, cancellation_tracker, shipment_context
    audit_log = []
    cancellation_tracker = []
    shipment_context = {}
    return jsonify({'success': True})

@app.route('/guardrail-status', methods=['GET'])
def guardrail_status():
    """Get guardrail status"""
    now = datetime.now()
    ten_minutes_ago = now - timedelta(minutes=10)
    recent_cancellations = [c for c in cancellation_tracker if c['timestamp'] > ten_minutes_ago]
    return jsonify({
        'cancellations_in_window': len(recent_cancellations),
        'guardrail_limit': 3,
        'status': 'BREACH' if len(recent_cancellations) >= 3 else 'OK',
        'recent_cancellations': recent_cancellations
    })

@app.route('/test-simple', methods=['POST'])
def test_simple():
    """Simple test endpoint"""
    try:
        data = request.json
        event_id = data.get('event_id', 'TEST')
        return jsonify({
            'event_id': event_id,
            'status': 'test_success',
            'message': 'Backend is working!',
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# HELPER FUNCTIONS: Gemini & PAI API calls
# ============================================================================

def _try_gemini(system_prompt: str, user_prompt: str, event_id: str) -> str:
    """Try calling Gemini API. Returns response text or empty string on failure."""
    if not GEMINI_API_KEY:
        return ""
    try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": f"{system_prompt}\n\n{user_prompt}"}]}
            ],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 1024,
                "thinkingConfig": {"thinkingBudget": 0}
            }
        }
        resp = http_requests.post(url, json=payload, timeout=25)
        if resp.status_code == 200:
            data = resp.json()
            text = data.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])[0].get('text', '')
            if text:
                audit_log.append({
                    'action': 'provider_call',
                    'event_id': event_id,
                    'decision': 'Used Gemini API',
                    'reasoning': 'Gemini 2.0 Flash',
                    'severity': 'INFO',
                    'timestamp': datetime.now().isoformat()
                })
                return text
        print(f"Gemini API returned {resp.status_code}: {resp.text[:200]}")
        return ""
    except Exception as e:
        print(f"Gemini API error: {e}")
        return ""

def _try_pai(system_prompt: str, user_prompt: str, event_id: str) -> str:
    """Try calling PAI API. Returns response text or empty string on failure."""
    if not PAI_API_KEY:
        return ""
    try:
        headers = {
            "Authorization": f"Bearer {PAI_API_KEY}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "gemma4:26b",
            "messages": [
                {"role": "user", "content": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nUSER QUESTION:\n{user_prompt}"}
            ]
        }
        resp = http_requests.post("https://pai-api.thepsi.com/api/v4/chat", json=payload, headers=headers, timeout=35)
        if resp.status_code == 200:
            lines = resp.text.strip().split('\n')
            # PAI streams accumulated text — each 'text' line contains the full response so far.
            # We only want the LAST 'text' entry (the complete response).
            final_text = ""
            for line in lines:
                if not line: continue
                try:
                    data = json.loads(line)
                    if data.get('type') == 'text':
                        final_text = data.get('content', '')  # overwrite, not append
                except: pass
            if final_text:
                audit_log.append({
                    'action': 'provider_call',
                    'event_id': event_id,
                    'decision': 'Used PAI API',
                    'reasoning': 'PAI gemma4:26b',
                    'severity': 'INFO',
                    'timestamp': datetime.now().isoformat()
                })
                return final_text
        print(f"PAI API returned {resp.status_code}")
        return ""
    except Exception as e:
        print(f"PAI API error: {e}")
        return ""

if __name__ == '__main__':
    print(f"\n{'='*60}")
    print(f"GlobalFreight AI Platform v{__version__}")
    print(f"{'='*60}\n")
    app.run(host='0.0.0.0', port=5001, debug=False)
