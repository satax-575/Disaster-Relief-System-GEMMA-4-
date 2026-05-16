# RAKSHA AI

AI-Powered Disaster Intelligence System

## Overview

RAKSHA AI is a disaster response platform that leverages Gemma 4 31B to provide emergency responders with real-time intelligence during natural disasters and mass casualty incidents. The system combines multimodal damage assessment, AI-guided medical triage, and autonomous incident coordination to support field operations when every second matters.

The platform is deployed on Render and accessible at: https://rakshak-frontend.onrender.com

## Core Capabilities

### Multimodal Damage Assessment

The system analyzes disaster scene photographs through a two-stage vision pipeline. HuggingFace BLIP (Salesforce/blip-image-captioning-large) generates detailed image captions, converting visual data into structured text descriptions. This intermediate text representation is then processed by Gemma 4 31B, which performs semantic analysis to extract damage severity scores on a 1-10 scale, identify structural hazards, estimate trapped persons, assess structural integrity status, and generate specific resource requirements including team counts and equipment needs.

This architecture allows Gemma 4 to apply its superior reasoning capabilities to vision tasks without requiring native multimodal support. The vision pipeline includes fallback providers: Groq Llama 4 Scout (meta-llama/llama-4-scout-17b-16e-instruct) and Mistral Pixtral (pixtral-large-2411) ensure continuous operation when primary services experience degradation.

### AI-Guided Medical Triage

The platform implements START protocol mass casualty triage through conversational AI powered by Gemma 4 31B. Field responders input patient symptoms, vital signs, age estimates, and observable conditions. The model analyzes this clinical data to assign triage colors according to START protocol: Red for immediate life-threatening conditions, Yellow for urgent but stable, Green for minor injuries, and Black for expectant or deceased.

Beyond color classification, Gemma 4 provides differential diagnoses, specific immediate interventions, vital sign targets for stabilization, medication considerations, transport priority recommendations, shock assessment with clinical reasoning, and monitoring interval guidance. This enables minimally trained volunteers to make protocol-compliant triage decisions with expert-level clinical reasoning.

### Autonomous Incident Coordination

A background monitoring agent continuously evaluates active incidents in the database. When critical situations (severity ≥5.0) remain unassigned beyond threshold timeframes, the system leverages Gemma 4's native function calling capabilities to autonomously execute coordination actions.

The model can dispatch appropriate responder teams by role and priority, broadcast multilingual emergency alerts with automatic translation, log medical triage entries with START protocol compliance, request specific resources with urgency levels, generate evacuation route guidance, and calculate medication dosages using clinical protocols.

This autonomous coordination removes manual bottlenecks and ensures rapid response to emerging threats without requiring constant human oversight.

### Multilingual Support

The platform provides native support for 10+ languages: English, Hindi, Tamil, Telugu, Bengali, Marathi, Arabic, Swahili, Spanish, and French. All AI responses, emergency alerts, and triage guidance automatically adapt to user language preferences. Gemma 4 handles translation and maintains clinical accuracy across languages.

## Technical Architecture

### Backend Infrastructure

The backend is built on FastAPI 0.115.5, a modern Python web framework that provides asynchronous request handling and automatic OpenAPI documentation generation. The application uses uvicorn 0.32.1 as the ASGI server with support for WebSocket connections and HTTP/2.

**Database Layer**: SQLite with Write-Ahead Logging (WAL) mode provides zero-latency local persistence with support for concurrent reads. The aiosqlite 0.20.0 library enables non-blocking database operations. The schema includes tables for incidents, responders, triage entries, alerts, chat sessions, and a sync queue for future mesh network capabilities.

**Data Validation**: Pydantic 2.10.3 handles request/response validation and serialization. All API endpoints use strongly typed models including Incident, Responder, TriageEntry, Alert, and ChatMessage with enum-based status fields for type safety.

**Real-Time Communication**: WebSocket endpoints at /ws/dashboard and /ws/chat provide real-time updates to connected clients. The ConnectionManager class handles connection lifecycle, broadcasting, and automatic cleanup of dead connections.

**HTTP Client**: httpx 0.27.2 provides async HTTP client functionality for all external API calls to Google AI, HuggingFace, Groq, and Mistral services. The library includes automatic retry logic with exponential backoff and connection pooling.

**Image Processing**: Pillow 11.0.0 handles image validation, format conversion, and base64 encoding/decoding for the vision pipeline.

### AI Model Integration

**Primary Model**: Gemma 4 31B (gemma-4-31b-it) accessed via Google Generative AI REST API at generativelanguage.googleapis.com/v1beta. The model provides text generation with 8192 token context window, native function calling with structured parameter schemas, and multimodal capabilities through text-based vision analysis.

**Vision Pipeline**: 
- HuggingFace BLIP (Salesforce/blip-image-captioning-large) via Inference API for image-to-text conversion
- Groq Llama 4 Scout (meta-llama/llama-4-scout-17b-16e-instruct) as vision fallback
- Mistral Pixtral (pixtral-large-2411) as secondary vision fallback

**Local Models**: Ollama integration supports local inference when cloud connectivity is unavailable. The system auto-detects installed models with priority order: gemma4 > llama > mistral. Communication occurs via Ollama's REST API at localhost:11434.

**Model Routing Logic**: The ModelSelector class implements intelligent provider selection with 30-second availability caching. It probes Google AI API for cloud availability, checks Ollama /api/tags endpoint for local models, and maintains fallback chains to ensure continuous operation.

**Function Calling**: Gemma 4 supports six native function tools: dispatch_responder, broadcast_emergency_alert, get_evacuation_route, log_medical_triage, request_resources, and calculate_dosage. Each function has a JSON schema defining required parameters and enum constraints. The GemmaClient class automatically executes called functions and incorporates results into responses.

### Frontend Implementation

The frontend is a Progressive Web App built with vanilla JavaScript (no framework dependencies) for maximum compatibility and minimal bundle size. The application uses a single-page architecture with client-side routing.

**UI Components**: Custom glassmorphism design system implemented in pure CSS. The interface includes a responsive sidebar navigation, real-time dashboard with statistics cards, interactive incident map using Leaflet.js 1.9.4, modal dialogs for data entry, and toast notifications for user feedback.

**Mapping**: Leaflet.js provides interactive geospatial visualization with OpenStreetMap tiles. Incidents are rendered as color-coded markers based on severity (red for critical, orange for high, yellow for moderate). The map supports clustering, popup details, and real-time marker updates via WebSocket.

**Service Worker**: Implements offline asset caching using Cache API. The service worker intercepts network requests and serves cached responses when available, enabling the UI to load even without connectivity. Cache invalidation occurs on version updates.

**WebSocket Client**: Maintains persistent connections to /ws/dashboard for real-time incident updates and /ws/chat for streaming AI responses. Automatic reconnection logic handles connection drops with exponential backoff.

**State Management**: Client-side state is managed through vanilla JavaScript with localStorage for session persistence. The application maintains active incident lists, responder status, alert history, and chat session data.

### Deployment Configuration

The application is containerized using Docker with a multi-stage build process. The Dockerfile uses python:3.11-slim as the base image, installs system dependencies (sqlite3, libsqlite3-dev, curl), copies backend requirements and installs Python packages, and exposes port 8000 with health check configuration.

**Docker Compose**: Orchestrates the backend service with environment variable injection, volume mounting for database persistence, health check configuration (30s interval, 10s timeout, 3 retries), and automatic restart policy.

**Render Deployment**: The application is deployed on Render's free tier with the following configuration:
- Runtime: Docker
- Region: Oregon (US West)
- Instance Type: Free (512MB RAM, 0.1 CPU)
- Health Check: GET /health endpoint
- Environment Variables: GOOGLE_API_KEY, GEMMA_CLOUD_MODEL, HUGGINGFACE_TOKEN, GROQ_API_KEY, MISTRAL_API_KEY
- Persistent Disk: 1GB mounted at /data for SQLite database
- Auto-Deploy: Enabled on main branch commits

The free tier includes automatic sleep after 15 minutes of inactivity with ~30 second cold start on first request. The health check endpoint ensures Render correctly detects service availability.

### Security Implementation

All API keys are loaded from environment variables using python-dotenv 1.0.1. No credentials are hardcoded in source code. The .env file is excluded from version control via .gitignore.

CORS middleware is configured with explicit origin whitelist loaded from CORS_ORIGINS environment variable. The application rejects wildcard origins when credentials are enabled to comply with CORS specification.

Frontend authentication is demonstration-only using localStorage-based session tokens. Production deployment requires implementation of proper authentication middleware with JWT tokens or OAuth2 flows.

## Installation and Local Development

### Prerequisites
- Python 3.11 or higher
- Google AI API key (obtain free at https://aistudio.google.com/app/apikey)
- Optional: Ollama for local model inference

### Setup Instructions

Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/raksha-ai.git
cd raksha-ai
```

Create Python virtual environment:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Configure environment variables:
```bash
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY
```

Run startup diagnostics:
```bash
python startup.py
```

This validates your environment configuration, tests API connectivity to Google AI, HuggingFace, Groq, and Mistral services, checks Ollama availability if installed, and verifies database write permissions.

Start development server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Access the application at http://localhost:8000

### Docker Deployment

Build and run with docker-compose:
```bash
export GOOGLE_API_KEY=your_api_key_here
docker-compose up --build
```

The application will be available at http://localhost:8000 with persistent database storage in the raksha_data volume.

### Environment Variables

**Required:**
- `GOOGLE_API_KEY`: Google AI API key for Gemma 4 31B access
- `GEMMA_CLOUD_MODEL`: Model identifier (default: gemma-4-31b-it)

**Optional:**
- `HUGGINGFACE_TOKEN`: HuggingFace API token for BLIP vision (rate-limited to 50 requests/day without token)
- `GROQ_API_KEY`: Groq API key for Llama 4 Scout vision fallback
- `MISTRAL_API_KEY`: Mistral API key for Pixtral vision fallback
- `OLLAMA_BASE_URL`: Ollama server URL (default: http://localhost:11434)
- `GEMMA_LOCAL_MODEL`: Local model name (default: gemma4:e4b)
- `DATABASE_URL`: SQLite database path (default: ./raksha.db)
- `PORT`: Server port (default: 8000)
- `CORS_ORIGINS`: Allowed CORS origins as JSON array
- `DEBUG`: Enable debug logging (default: false)

**Performance Tuning:**
- `GEMMA_CLOUD_TIMEOUT`: Cloud API timeout in seconds (default: 60)
- `GEMMA_CLOUD_RETRIES`: Number of retry attempts (default: 3)
- `OLLAMA_TIMEOUT`: Ollama timeout in seconds (default: 120)
- `MODEL_CHECK_INTERVAL`: Availability cache TTL in seconds (default: 30)

### Local Model Setup

Install Ollama from https://ollama.com

Pull supported models:
```bash
ollama pull gemma4:e2b    # Lightweight, phones/Raspberry Pi
ollama pull gemma4:e4b    # Laptops, local assistants, multimodal
ollama pull llama3.2:3b   # Lightweight alternative, 2GB
ollama pull mistral:7b    # Alternative, 4.1GB
```

The system automatically detects installed models and uses them when cloud connectivity is unavailable.

## API Reference

### Core REST Endpoints

**Health and Status**
- `GET /health` - Health check endpoint returning service status
- `GET /api/v1/status` - System status including model availability, active incidents, and available responders

**Incident Management**
- `GET /api/v1/incidents` - List incidents with optional status filtering and pagination
- `POST /api/v1/incidents` - Create new incident report with coordinates and description
- `GET /api/v1/incidents/{incident_id}` - Retrieve specific incident details
- `PATCH /api/v1/incidents/{incident_id}` - Update incident status or details

**Damage Assessment**
- `POST /api/v1/assess` - Multimodal damage assessment with multipart form image upload
- `POST /api/v1/assess/base64` - Damage assessment with base64-encoded image for JavaScript clients

**AI Conversation**
- `POST /api/v1/chat` - AI conversation with Gemma 4 31B, supports optional image attachment, conversation history, language selection, and function calling

**Medical Triage**
- `POST /api/v1/triage` - Create medical triage entry with AI guidance using START protocol
- `GET /api/v1/triage` - List triage entries with optional incident filtering

**Emergency Alerts**
- `POST /api/v1/alerts` - Create and broadcast emergency alert with multilingual translation
- `GET /api/v1/alerts` - List recent alerts with pagination

**Responder Management**
- `GET /api/v1/responders` - List responders with optional status and role filtering
- `POST /api/v1/responders` - Register new responder with role, team, and skills
- `GET /api/v1/responders/{responder_id}` - Retrieve specific responder details
- `POST /api/v1/dispatch` - Dispatch responder to incident with priority assignment

**Evacuation and Resources**
- `POST /api/v1/routes` - Generate evacuation route guidance with hazard awareness
- `POST /api/v1/mesh/sync` - Peer-to-peer mesh network data synchronization for future offline capabilities

### WebSocket Endpoints

**Real-Time Dashboard**
- `WS /ws/dashboard` - Real-time incident, responder, and alert updates
  - Sends initial state on connection with all active data
  - Broadcasts incident_created, incident_updated, responder_dispatched, new_alert, triage_entry events
  - Supports ping/pong for connection health monitoring

**Streaming AI Chat**
- `WS /ws/chat` - Streaming AI conversation with Gemma 4 31B
  - Maintains session history across messages
  - Sends thinking indicators during processing
  - Streams function call execution results
  - Supports image attachments via base64

### Interactive Documentation

- `/api/docs` - Swagger UI with interactive API testing
- `/api/redoc` - ReDoc documentation with detailed schemas

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

## System Architecture

### Model Routing and Fallback

RAKSHA AI implements intelligent provider selection with automatic failback to ensure continuous operation:

**Primary Path: Gemma 4 31B via Google AI API**
- Highest quality responses with 8192 token context window
- Native function calling with structured parameter schemas
- Multimodal support through text-based vision analysis
- 3 retry attempts with exponential backoff (2s, 4s, 8s delays)
- Used when GOOGLE_API_KEY is configured and API returns 200 status

**Secondary Path: Local Models via Ollama**
- Operates without internet connectivity requirements
- Automatic model detection from installed Ollama models
- Priority selection: gemma4 > llama > mistral
- Used when cloud API is unreachable or returns 429/503 errors

**Tertiary Path: Groq Fallback**
- Groq Llama 4 Scout (meta-llama/llama-4-scout-17b-16e-instruct) for fast inference
- Used when both cloud Gemma and local Ollama are unavailable
- Requires GROQ_API_KEY environment variable

**Quaternary Path: Static Emergency Protocols**
- Hard-coded emergency contact numbers for India (112, 1078, 108, 101)
- Basic safety procedures for common disaster scenarios
- Never fails, always returns actionable guidance
- Used as absolute last resort when all AI providers are unavailable

Model availability is cached for 30 seconds to minimize latency on repeated requests. The ModelSelector class probes Google AI /models endpoint and Ollama /api/tags endpoint to determine availability.

### Vision Processing Pipeline

Multimodal damage assessment uses a two-stage architecture to enable Gemma 4 vision capabilities:

**Stage 1: Image to Text Conversion**
- Primary: HuggingFace BLIP (Salesforce/blip-image-captioning-large) via Inference API
- Fallback 1: Groq Llama 4 Scout with native vision support
- Fallback 2: Mistral Pixtral with multimodal capabilities
- Output: Detailed natural language description of image contents

**Stage 2: Semantic Analysis**
- Input: Text caption from Stage 1 plus context (disaster type, building type)
- Processing: Gemma 4 31B analyzes caption with disaster response expertise
- Output: Structured JSON with damage_severity (1-10 float), hazards array, structural_integrity enum, estimated_trapped integer, recommended_actions array, intelligence_summary string, resource_requirements object

This architecture allows Gemma 4 to apply its superior reasoning to vision tasks without requiring native multimodal API support. The intermediate text representation preserves semantic information while enabling structured output generation.

### Function Calling Implementation

Gemma 4 31B supports six native function tools defined with JSON schemas:

**dispatch_responder**: Sends emergency teams to incident locations with parameters for incident_id, responder_role (enum: medical, search_rescue, firefighter, ndrf, volunteer), priority (enum: critical, high, medium, low), and location_description.

**broadcast_emergency_alert**: Distributes multilingual alerts with parameters for title, message, severity (enum: extreme, severe, moderate, minor), and languages array.

**get_evacuation_route**: Generates evacuation guidance with parameters for origin_description, hazard_type, and mobility_level (enum: full, limited, wheelchair, carrying_injured).

**log_medical_triage**: Creates patient triage records with parameters for symptoms array, triage_color (enum: red, yellow, green, black), age_estimate, and location.

**request_resources**: Requests equipment and supplies with parameters for resources array, urgency (enum: immediate, within_hour, within_day), and delivery_location.

**calculate_dosage**: Computes medication dosages with parameters for medication, patient_weight_kg, patient_age, and route (enum: IV, IM, PO).

When Gemma 4 determines a function should be executed, it returns a functionCall object in the response. The GemmaClient class automatically executes the function, updates database state, broadcasts WebSocket events, and incorporates results into the final response message.

### Real-Time Communication

WebSocket connections enable bidirectional real-time communication between server and clients:

**Dashboard WebSocket (/ws/dashboard)**
- Sends initial_state message on connection with all active incidents, responders, and alerts
- Broadcasts incident_created, incident_updated, responder_dispatched, new_alert, triage_entry, overwatch_action, mesh_sync events
- Supports ping/pong messages for connection health monitoring
- Automatic cleanup of dead connections with exception handling

**Chat WebSocket (/ws/chat)**
- Maintains session_id and conversation history across messages
- Sends thinking indicator during AI processing
- Streams response message with model attribution
- Includes function_calls and function_results in response
- Handles image attachments via base64 encoding

The ConnectionManager class manages active connections, implements broadcast functionality with JSON serialization, and handles datetime serialization for database timestamps.

## Production Deployment

The application is deployed on Render at https://rakshak-frontend.onrender.com with the following production configuration:

**Infrastructure**
- Platform: Render Free Tier
- Runtime: Docker container
- Region: Oregon (US West)
- Instance: 512MB RAM, 0.1 CPU
- Persistent Storage: 1GB disk mounted at /data

**Configuration**
- Health Check: GET /health endpoint with 30s interval, 10s timeout, 3 retries
- Auto-Deploy: Enabled on main branch commits via GitHub integration
- Environment Variables: Injected via Render dashboard (GOOGLE_API_KEY, HUGGINGFACE_TOKEN, GROQ_API_KEY, MISTRAL_API_KEY)
- CORS Origins: Configured for https://rakshak-frontend.onrender.com
- Database: SQLite with persistent volume ensures data survives container restarts

**Performance**
- Server startup: ~2 seconds (database initialization and model availability check)
- Cloud AI response: 2-5 seconds (Gemma 4 31B via Google AI API)
- Local AI response: 5-15 seconds (Gemma 4 E4B on CPU)
- Vision assessment: 3-8 seconds (BLIP captioning plus Gemma 4 analysis)
- Database operations: <10ms (SQLite WAL mode with async I/O)
- WebSocket latency: <100ms for real-time updates
- Cold start: ~30 seconds after 15 minutes of inactivity (free tier limitation)

**Monitoring**
- Health check endpoint monitors service availability
- Render dashboard provides CPU, memory, and bandwidth metrics
- Application logs accessible via Render CLI or dashboard

For production deployment beyond free tier, upgrade to Render Standard plan for always-on instances, increased resources, and zero cold starts.

## Acknowledgments

Built with Gemma 4 31B from Google DeepMind. Vision capabilities powered by HuggingFace BLIP.
