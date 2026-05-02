# GlobalFreight AI Platform

> **AI-Fortnight 2026 — Intellithon Challenge**
> A full-stack AI logistics platform with RAG-powered document querying (Level 1) and autonomous exception handling (Level 2).

---

## Features

### Level 1 — RAG Shipment Assistant
- Chat interface powered by retrieval-augmented generation (RAG)
- Queries 3 policy documents: Carrier SLA, Customs Tariff, Shipment Delay Policy
- Upload custom documents to expand the knowledge base
- Source attribution for every answer

### Level 2 — Exception Handler Agent
- Processes a **20-event logistics disruption stream** autonomously
- AI agent classifies severity (CRITICAL / HIGH / MEDIUM / LOW) per event
- **10 agent tools**: notify customer, escalate, flag customs, arrange routing, apply compensation, request cancellation, update ETA, query policy, get shipment history, log decision
- **Safety guardrail**: blocks the 3rd cancellation in any 10-minute window and escalates to Operations Manager
- **Context awareness**: remembers shipment history across events (e.g., EVT-001 → EVT-008)
- **Live audit logs** with color-coded entries by action type and severity
- **JSON file upload** to load custom event streams

### Multi-Provider AI
Switch between **3 LLM providers** from the header dropdown — applies to both Level 1 and Level 2:

| Provider | Model | Use Case |
|---|---|---|
| Azure OpenAI | gpt-5-nano | Primary (tool-calling agent) |
| Gemini | 2.5 Flash | Fast fallback |
| PAI | gemma4:26b | Challenge-specified endpoint |

Automatic fallback chain: if the selected provider fails, the system tries the others.

---

## Project Structure

```
├── backend.py              # Flask API server (Level 1 + Level 2)
├── requirements.txt        # Python dependencies
├── .env                    # API keys (gitignored)
├── .env.example            # Template for API keys
├── data/                   # Policy documents (DOC1, DOC2, DOC3)
├── frontend/               # Next.js 16 frontend
│   ├── app/                # App router (page.tsx)
│   ├── components/
│   │   ├── Header.tsx      # Top bar with model dropdown
│   │   ├── TabSwitcher.tsx # Level 1 / Level 2 tabs
│   │   ├── Level1/         # RAG assistant UI
│   │   └── Level2/         # Exception handler UI
│   └── public/data/        # Event stream JSON
├── LEVEL2/                 # Challenge spec (README + event_stream.json) — DO NOT MODIFY
└── LEVEL3FILES/            # Level 3 challenge files
```

---

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Python | 3.9+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |

---

## Setup — macOS

### 1. Clone & enter the project

```bash
cd ~/Desktop/SECOND\ AGENT
```

### 2. Create Python virtual environment

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 3. Configure API keys

```bash
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=https://ai-fortnight.cognitiveservices.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-5-nano
AZURE_OPENAI_API_VERSION=2024-12-01-preview
GEMINI_API_KEY=your_gemini_key
PAI_API_KEY=your_pai_key
```

### 4. Start the backend

```bash
source .venv/bin/activate
python backend.py
```

You should see:
```
GlobalFreight AI Platform v2.0-combined
 * Running on http://127.0.0.1:5001
```

### 5. Start the frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

### 6. Open the app

Navigate to **http://localhost:3000** in your browser.

---

## Setup — Windows

### 1. Open PowerShell and navigate to the project

```powershell
cd "$env:USERPROFILE\Desktop\SECOND AGENT"
```

### 2. Create Python virtual environment

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

> **Note:** If you get an execution policy error, run:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

### 3. Configure API keys

```powershell
copy .env.example .env
```

Edit `.env` with Notepad or VS Code:

```powershell
notepad .env
```

Fill in the same keys as shown in the macOS section above.

### 4. Start the backend

```powershell
.\.venv\Scripts\Activate.ps1
python backend.py
```

### 5. Start the frontend (new PowerShell window)

```powershell
cd frontend
npm install
npm run dev
```

### 6. Open the app

Navigate to **http://localhost:3000** in your browser.

---

## API Endpoints

### Health & Config
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Server health check |
| GET | `/get-provider` | Get active LLM provider |
| POST | `/set-provider` | Switch provider (`{"provider": "gemini"}`) |

### Level 1 — RAG
| Method | Endpoint | Description |
|---|---|---|
| POST | `/query` | Ask a question (`{"question": "..."}`) |
| GET | `/documents` | List loaded documents |
| POST | `/documents/add` | Add a document |
| POST | `/documents/remove` | Remove a document |
| POST | `/documents/reset` | Reset to default documents |

### Level 2 — Exception Handler
| Method | Endpoint | Description |
|---|---|---|
| POST | `/process-event` | Process a single event |
| GET | `/audit-log` | Get all audit log entries |
| POST | `/audit-log/clear` | Clear the audit log |
| GET | `/guardrail-status` | Check cancellation guardrail |
| POST | `/test-simple` | Simple connectivity test |

---

## The Critical Guardrail

> No agent — human or AI — may cancel more than 3 shipments in any 10-minute window.

Events **EVT-011**, **EVT-016**, and **EVT-018** are cancellation requests. On the 3rd one (EVT-018), the agent **must** detect the breach, pause, and escalate to the Operations Manager.

This is enforced at **two levels**:
1. **Frontend**: Tracks cancellation timestamps client-side and blocks the 3rd request
2. **Backend**: The `request_cancellation_approval` tool checks the server-side counter

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `ImportError: AgentExecutor` | Ensure `langchain-classic` is installed: `pip install langchain-classic` |
| Backend won't start | Check `.env` has a valid `AZURE_OPENAI_API_KEY` |
| Frontend shows "Failed to fetch" | Make sure backend is running on port 5001 |
| PAI returns gibberish | Fixed — PAI streams accumulated text, backend takes only the last entry |
| Gemini 404 error | Uses `gemini-2.5-flash` (2.0-flash is deprecated) |
| Port 5001 already in use | Kill it: `lsof -ti:5001 \| xargs kill -9` (macOS) or `netstat -ano \| findstr :5001` (Windows) |

---

## Tech Stack

- **Backend**: Python 3.11, Flask, LangChain, ChromaDB, HuggingFace Embeddings
- **Frontend**: Next.js 16 (Turbopack), React 19, TypeScript, Framer Motion, Tailwind CSS
- **LLMs**: Azure OpenAI (gpt-5-nano), Google Gemini 2.5 Flash, PAI (gemma4:26b)
- **Embeddings**: sentence-transformers/all-MiniLM-L6-v2 (local, no API needed)
