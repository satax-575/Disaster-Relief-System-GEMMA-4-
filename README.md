# RAKSHA AI

AI-Powered Disaster Intelligence System

## Overview

RAKSHA AI is a disaster response platform powered by Gemma 4 31B that provides emergency responders with AI intelligence during natural disasters and mass casualty incidents. The system delivers real-time damage assessment, medical triage guidance, and autonomous incident coordination.

## Key Features

- **Multimodal Damage Assessment**: Analyzes disaster photos to identify structural damage, hazards, trapped persons, and resource requirements using HuggingFace BLIP vision and Gemma 4 31B analysis.

- **AI-Guided Medical Triage**: Implements START protocol with real-time AI reasoning. Provides Red/Yellow/Green/Black classification and clinical recommendations for field medics.

- **Autonomous Coordination**: Background agent monitors critical incidents and automatically dispatches responder teams using Gemma 4 function calling.

- **Offline Operation**: Progressive Web App with service worker caching, SQLite persistence, and local Ollama model support for zero-connectivity scenarios.

- **Multilingual**: Supports 10+ languages including Hindi, Tamil, Telugu, Bengali, Marathi, Arabic, Swahili, Spanish, and French.

## Technical Stack

**Backend**: FastAPI, SQLite with WAL mode, WebSocket, Pydantic, aiosqlite

**AI Models**: 
- Primary: Gemma 4 31B (Google AI API)
- Offline: Local models via Ollama (gemma2, llama, mistral)
- Vision: HuggingFace BLIP, Groq Llama 4 Scout, Mistral Pixtral

**Frontend**: Vanilla JavaScript, Leaflet.js maps, Service Worker, PWA

**Deployment**: Docker, uvicorn ASGI server

## Quick Start

### Prerequisites
- Python 3.11+
- Google AI API key (get free at https://aistudio.google.com/app/apikey)
- Optional: Ollama for offline mode

### Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/raksha-ai.git
cd raksha-ai

# Setup Python environment
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# Run diagnostics
python startup.py

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000

### Docker Deployment

```bash
export GOOGLE_API_KEY=your_api_key_here
docker-compose up --build
```

### Environment Variables

**Required:**
- `GOOGLE_API_KEY`: Google AI API key for Gemma 4 31B

**Optional:**
- `HUGGINGFACE_TOKEN`: For BLIP vision (rate-limited without)
- `GROQ_API_KEY`: Groq vision fallback
- `MISTRAL_API_KEY`: Mistral vision fallback
- `OLLAMA_BASE_URL`: Ollama server (default: http://localhost:11434)
- `GEMMA_LOCAL_MODEL`: Local model name (default: gemma2:9b)

### Local Offline Models

```bash
# Install Ollama from https://ollama.com
ollama pull gemma2:9b     # Recommended
ollama pull gemma2:27b    # Higher quality
ollama pull mistral:7b    # Alternative
```

## API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `GET /api/v1/status` - System status and model availability
- `GET /api/v1/incidents` - List incidents
- `POST /api/v1/incidents` - Create incident
- `POST /api/v1/assess` - Damage assessment with image
- `POST /api/v1/chat` - AI conversation with Gemma 4 31B
- `POST /api/v1/triage` - Medical triage with AI guidance
- `POST /api/v1/alerts` - Broadcast emergency alert
- `GET /api/v1/responders` - List responders
- `POST /api/v1/dispatch` - Dispatch responder to incident

### WebSocket
- `/ws/dashboard` - Real-time updates
- `/ws/chat` - Streaming AI chat

### Documentation
- `/api/docs` - Interactive OpenAPI documentation
- `/api/redoc` - ReDoc documentation

## Project Structure

```
raksha-ai/
├── backend/
│   ├── main.py                      # FastAPI application and routes
│   ├── gemma_client.py              # Gemma 4 unified client with routing
│   ├── ai_core.py                   # Multi-provider cascade fallback
│   ├── providers.py                 # Centralized provider configuration
│   ├── vision_agent.py              # Multimodal vision pipeline
│   ├── triage_agent.py              # Medical triage AI logic
│   ├── medical_rag.py               # Protocol retrieval system
│   ├── multimodal_connectors.py     # Vision API integrations
│   ├── database.py                  # SQLite async database layer
│   ├── models.py                    # Pydantic data models
│   ├── config.py                    # Environment validation
│   ├── startup.py                   # Diagnostic checks
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # Environment template
├── frontend/
│   ├── index.html                   # Main application interface
│   ├── auth.html                    # Authentication gate
│   ├── app.js                       # Core application logic
│   ├── styles.css                   # Design system
│   ├── dashboard_enhancements.css   # Additional styling
│   ├── manifest.json                # PWA manifest
│   └── sw.js                        # Service worker
├── Dockerfile                       # Container definition
├── docker-compose.yml               # Service orchestration
├── ARCHITECTURE.md                  # Detailed architecture documentation
└── README.md                        # This file
```

## How It Works

### AI Model Routing

RAKSHA AI uses Gemma 4 31B as the primary intelligence engine with automatic fallback:

1. **Gemma 4 31B (Primary)** - Google AI API
   - Highest quality responses
   - Native function calling for autonomous actions
   - Multimodal vision support
   - Used when GOOGLE_API_KEY is configured

2. **Local Models (Offline)** - Ollama
   - Runs without internet (gemma2, llama, mistral)
   - Automatic detection of installed models
   - Used when cloud is unavailable

3. **Static Protocols (Last Resort)**
   - Emergency contact numbers
   - Basic safety procedures
   - Never fails

### Vision Pipeline

1. Image captioning via HuggingFace BLIP (or Groq/Mistral fallback)
2. Caption analysis by Gemma 4 31B
3. Structured JSON output with damage assessment, hazards, and recommendations

### Medical Triage

Gemma 4 31B analyzes symptoms and vitals to provide:
- START protocol color classification (Red/Yellow/Green/Black)
- Differential diagnosis
- Immediate interventions
- Vital sign targets
- Transport priority

### Function Calling

Gemma 4 31B can autonomously execute actions:
- Dispatch responders
- Broadcast alerts
- Log triage entries
- Request resources
- Calculate medication dosages

## Production Deployment

Recommended platforms:
- **Oracle Cloud**: Free tier with 24GB RAM
- **Render.com**: Free tier (cold starts after 15 min)
- **Railway**: Paid, reliable
- **DigitalOcean**: App Platform

Configuration checklist:
- Set `DEBUG=false`
- Configure `CORS_ORIGINS` with actual domain
- Use persistent volume for SQLite database
- Set up health check at `/health`
- Configure SSL/TLS
- Implement proper authentication (current auth is demo-only)

## License

Developed for Gemma 4 Hackathon. License terms to be determined.

## Acknowledgments

Built with Gemma 4 31B from Google DeepMind. Vision capabilities powered by HuggingFace BLIP.
