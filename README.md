# DocQent

## GraniteDocs: Collaborative AI Documentation Engine

GraniteDocs is a professional-grade, real-time collaborative editor that transforms the standard "AI Chat" experience into a structured Technical Documentation Engine. Built with a focus on data grounding, precision, and enterprise-level security.

## Key Features

- Documentation-First AI: Powered by IBM Granite-4.0, specifically tuned to avoid conversational filler and output structured Markdown.
- Web-Augmented Generation (RAG): Real-time web search integration via Tavily AI to ensure documentation is grounded in current facts.
- Live Collaboration: Multi-user editing via WebSockets, enabling teams to build documentation together.
- JWT Authentication: Secure, signed access tokens for protected API and WebSocket routes.
- IDOR Protection: Every request is verified server-side to ensure users can only access their own documents.
- Bcrypt Hashing: Modern password protection with a legacy SHA-256 fallback for seamless user migration.
- Streaming Responses: Real-time token streaming using FastAPI `StreamingResponse` for zero-latency feedback.

## Evaluation

- LLM-as-a-Judge: Response quality was evaluated using the Gemini model as an external judge.
- Perplexity: Language-model perplexity was used as an additional quantitative fluency metric.

DocQent is a full-stack collaborative documentation platform with:
- Real-time multi-user editing (WebSocket + Redis)
- Authentication (JWT)
- Document ownership and sharing

## Tech Stack

- Backend: FastAPI, SQLAlchemy (async), MySQL, Redis
- Frontend: React + TypeScript + Vite
- Auth: JWT (`python-jose`)
- AI: `llama-cpp-python`, Tavily API (optional)

## Project Structure

```text
.
├── app/                 # FastAPI backend
│   ├── main.py          # API entrypoint
│   ├── routers/         # users, documents, collaboration, ai
│   ├── model/           # SQLAlchemy models
│   ├── auth.py
│   ├── crud.py
│   └── database.py
├── frontend/            # React frontend
├── docker-compose.yml   # MySQL + Redis services
└── requirements.txt     # Backend dependencies
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- Docker + Docker Compose

Notes:
- `TavilyClient_api_key` is only needed for `/ai/ask_web`.
- The local GGUF model path is currently hardcoded in `app/routers/ai.py`.

## Quick Start

1. Start MySQL and Redis

```bash
docker compose up -d
```

2. Set up backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

3. Run backend (from `app/` folder)

```bash
cd app
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

4. Run frontend (new terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`  
Backend URL: `http://localhost:8000`  
API docs: `http://localhost:8000/docs`

## Main API Areas

- `POST /users/register` - register
- `POST /users/login` - login
- `POST /users/token` - OAuth2 token endpoint
- `GET /users/me` - current user
- `POST /documents` - create document
- `GET /documents/{document_id}` - get document
- `PUT /documents/{document_id}` - update document
- `DELETE /documents/{document_id}` - delete document
- `POST /collaboration/share` - add collaborator
- `DELETE /collaboration/share` - remove collaborator
- `WS /ws/collaboration/{document_id}` - real-time collaboration
- `POST /ai/ask` - local LLM answer
- `POST /ai/ask_web` - web-grounded answer

## License

Add your preferred license (for example: MIT) in a `LICENSE` file.
