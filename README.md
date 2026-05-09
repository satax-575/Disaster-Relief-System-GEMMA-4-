# 🛡️ RAKSHA AI — Offline-First Disaster Intelligence
### Powered by Gemma 4 & Ollama

[![Live Demo](https://img.shields.io/badge/Live_Demo-Render-brightgreen)](https://gemma-hackathon.onrender.com/)
[![Track](https://img.shields.io/badge/Track-Global_Resilience-blue)](#)
[![Tech](https://img.shields.io/badge/Tech-Gemma_4-orange)](#)

**RAKSHA** (Sanskrit for "Protection") is a production-grade, mission-critical disaster response platform. It provides field responders with AI-grade intelligence — multimodal damage assessment, medical triage, and autonomous coordination — even when the internet has completely failed.

---

## 🚀 Live Deployment
👉 **[https://gemma-hackathon.onrender.com/](https://gemma-hackathon.onrender.com/)**

---

## ✨ Key Innovations

### 1. 🤖 Dual-Mode Gemma 4 Intelligence
- **Cloud**: Gemma 4 31B (`gemma-4-31b-it`) via Google AI API — when online
- **Local**: Any Ollama model (gemma2:9b, mistral, llama) — when offline
- Automatic, transparent switching with 3-retry exponential backoff
- Graceful degradation to Pollinations cascade if both fail

### 2. 👁️ Zero-Cost Multimodal Vision Pipeline
Analyzes disaster footage to identify structural damage, trapped persons, and hazards using HuggingFace BLIP + LLM cascade — no GPU infrastructure required.

### 3. 🏥 AI-Guided Medical Triage
Guides untrained volunteers through START Triage Protocol with real-time AI reasoning (Red/Yellow/Green/Black priority assignment).

### 4. 🤖 Autonomous Overwatch Agent
Background AI commander that monitors critical unassigned incidents and automatically dispatches responders using native function calling.

### 5. 🌐 Multilingual & Offline-First PWA
- Installable on any smartphone with full offline UI caching
- 10+ languages: Hindi, Tamil, Bengali, Telugu, Marathi, Arabic, Swahili, Spanish, French

---

## 🛠️ Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     RAKSHA AI Architecture                   │
├─────────────────┬───────────────────────────────────────────┤
│  Frontend       │  Vanilla JS + CSS Glassmorphism            │
│  (PWA/SPA)      │  Service Worker for offline caching        │
├─────────────────┼───────────────────────────────────────────┤
│  Backend        │  FastAPI (Python 3.11) + aiosqlite        │
│                 │  WebSocket real-time updates               │
├─────────────────┼───────────────────────────────────────────┤
│  AI (Cloud)     │  Gemma 4 (gemma-4-31b-it) via Google AI    │
│  AI (Local)     │  Ollama: gemma2, mistral, llama           │
│  AI (Cascade)   │  Pollinations → DuckDuckGo → Static       │
├─────────────────┼───────────────────────────────────────────┤
│  Vision         │  HuggingFace BLIP → LLM analysis          │
│  RAG            │  In-memory medical protocol retrieval      │
│  Database       │  SQLite WAL-mode (offline sync queue)      │
└─────────────────┴───────────────────────────────────────────┘
```

---

## 📋 Setup & Run Instructions

### Prerequisites
- Python 3.11+
- (Optional) [Ollama](https://ollama.com) for local offline AI
- (Optional) [Google AI API Key](https://aistudio.google.com/app/apikey) for cloud Gemma 4

### 1. Clone the Repository
```bash
git clone https://github.com/saugata-malakar/GEMMA-HACKATHON.git
cd GEMMA-HACKATHON
```

### 2. Set Up Python Environment
```bash
cd backend
python -m venv .venv

# Activate (Windows)
.venv\Scripts\activate
# Activate (Linux/Mac)
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configure Environment
```bash
# Copy the example and fill in your values
cp .env.example .env
```

Edit `.env` with your settings:
```env
# Required for cloud Gemma 4 (get free key at aistudio.google.com)
GOOGLE_API_KEY=your_key_here
GEMMA_CLOUD_MODEL=gemma-4-31b-it

# Optional: local Ollama model
OLLAMA_BASE_URL=http://localhost:11434
GEMMA_LOCAL_MODEL=gemma2:9b
```

### 4. (Optional) Set Up Ollama for Local/Offline Mode
```bash
# Install Ollama from https://ollama.com
# Then pull a supported model (choose based on your VRAM):
ollama pull gemma2:9b    # ~5.5GB — Recommended
ollama pull gemma2:27b   # ~16GB — Best quality
ollama pull mistral:7b   # ~4.1GB — Alternative
ollama pull llama3.2:3b  # ~2GB   # Lightweight
```

### 5. Run Startup Diagnostics
```bash
python startup.py
```

This validates your environment and API connections before launching.

### 6. Start the Server

**Development (with auto-reload):**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Production:**
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --proxy-headers
```

**Then open:** [http://localhost:8000](http://localhost:8000)

---

## 🐳 Docker Deployment

```bash
# Set your API key
export GOOGLE_API_KEY=your_key_here

# Build and run
docker-compose up --build

# Access at http://localhost:8000
```

---

## 🌐 AI Model Routing

RAKSHA AI automatically selects the best available model:

```
Request → Check connectivity (cached 30s)
          │
          ├─ Google AI reachable + API key set?
          │   YES → Gemma 4 (gemma-4-31b-it) — 3 retries with backoff
          │
          ├─ Ollama running + model installed?
          │   YES → Local model (auto-detected)
          │
          └─ Cascade fallback (never fails):
              → Pollinations free LLM (Mistral, no key)
              → DuckDuckGo web search
              → Static emergency protocols
```

---

## 🔑 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/status` | GET | System status + model availability |
| `/api/v1/incidents` | GET/POST | Incident management |
| `/api/v1/assess/base64` | POST | Damage assessment (base64 image) |
| `/api/v1/chat` | POST | AI chat conversation |
| `/api/v1/triage` | POST | Medical triage with AI guidance |
| `/api/v1/alerts` | GET/POST | Emergency alerts |
| `/api/v1/responders` | GET/POST | Responder management |
| `/ws/dashboard` | WebSocket | Real-time dashboard updates |
| `/ws/chat` | WebSocket | Streaming AI chat |
| `/api/docs` | GET | Interactive API documentation |

---

## 📱 Offline Mode

RAKSHA AI is an installable Progressive Web App:
1. Open [http://localhost:8000](http://localhost:8000) in Chrome/Edge
2. Click "Install" in the browser address bar
3. The app will cache all UI assets automatically
4. In offline mode, the app uses local Ollama (if installed) or emergency static protocols

---

## 🔒 Security Notes

- No hardcoded API keys in source code
- All secrets loaded from environment variables
- `.env` is in `.gitignore`
- Frontend auth is demo-only (localStorage simulation) — not production auth
- CORS configured with explicit origin whitelist

---

## 📊 Performance

- **Startup time**: ~2s (SQLite init + model check)
- **Cloud response**: ~2-5s (Gemma 4 27B via Google AI)
- **Local response**: ~5-15s (Gemma 2 9B on CPU, faster on GPU)
- **Vision assessment**: ~3-8s (BLIP captioning + LLM analysis)
- **Database**: SQLite WAL-mode handles concurrent reads with zero latency

---

## 🏗️ Project Structure

```
GEMMA-HACKATHON/
├── backend/
│   ├── main.py              # FastAPI app, WebSocket, routes
│   ├── gemma_client.py      # Gemma 4 cloud/local routing
│   ├── ai_core.py           # Multi-provider fallback cascade
│   ├── vision_agent.py      # BLIP + LLM vision pipeline
│   ├── triage_agent.py      # Medical triage AI
│   ├── medical_rag.py       # Protocol retrieval (keyword-based)
│   ├── multimodal_connectors.py  # Ollama/Groq/Mistral vision
│   ├── database.py          # SQLite async database layer
│   ├── models.py            # Pydantic data models
│   ├── startup.py           # Startup diagnostics
│   ├── requirements.txt     # Python dependencies
│   └── .env.example         # Environment template
├── frontend/
│   ├── index.html           # Main application UI
│   ├── auth.html            # Authentication gate
│   ├── app.js               # Core JavaScript logic
│   ├── styles.css           # Design system
│   ├── dashboard_enhancements.css
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker (offline)
├── Dockerfile               # Container definition
├── docker-compose.yml       # Multi-service orchestration
├── ARCHITECTURE.md          # Detailed architecture docs
├── KAGGLE_WRITEUP.md        # Hackathon submission writeup
└── README.md                # This file
```
