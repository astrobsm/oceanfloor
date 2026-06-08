# OceanFloor — Medical Research Assistant™ (MRA)

OceanFloor is an enterprise-grade **AI-Powered Medical Research Ecosystem**. It functions as a
virtual Medical Research Institute, Biostatistics Center, Academic Writing Center, Reference
Management System, Research Methodology Unit, Data Analysis Center, Publication Support Office,
and Scientific Knowledge Repository ("Ocean Floor of Medical Knowledge").

This repository contains a **modular reference architecture** translating the MRA master
specification into deployable services:

| Layer | Technology | Folder |
|-------|------------|--------|
| Web client | React + TypeScript + Vite | [`frontend/`](frontend/) |
| API gateway / orchestration | FastAPI (Python) | [`backend/`](backend/) |
| Statistical compute | Python (SciPy/Statsmodels/Lifelines) + R bridge | [`statistical-service/`](statistical-service/) |
| Persistence | PostgreSQL | (via `backend` SQLAlchemy models) |
| Knowledge graph | Postgres + graph adapter (Neo4j-ready) | [`backend/app/knowledge/`](backend/app/knowledge/) |
| AI agents | Pluggable LLM provider layer | [`backend/app/agents/`](backend/app/agents/) |

> See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system design and the mapping
> from each specification "Engine" to its implementing module.

## Research engines (modules)

1. Research Idea Generation Engine
2. Automated Research Proposal Engine
3. Advanced Literature Review Engine
4. Questionnaire & Data Collection Engine
5. Sample Size Calculation Engine
6. Biostatistics & Data Analysis Engine
7. Hypothesis Engine
8. SPSS Compatibility Engine
9. Reference Management + Universal Referencing Engine
10. Discussion & Interpretation Engine
11. Manuscript Writing Engine
12. Presentation Engine
13. Plagiarism / Academic Integrity Engine
14. Research Quality Assurance Engine
15. Journal Matching Engine
16. Export Engine
17. Knowledge Ocean Repository

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API + docs: http://localhost:8000/docs
- Statistical service: http://localhost:8001/docs

## Quick start (local dev)

**Backend**
```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # Windows PowerShell: .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Statistical service**
```bash
cd statistical-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## Design principles

- **Modular engines** — every specification engine is an isolated service module with its own
  router, schema, and service class, so teams can iterate independently.
- **No fabricated science** — literature/reference engines only surface verifiable identifiers
  (DOI/PMID) returned from real providers. The system never invents citations or DOIs.
- **Provider-agnostic AI** — the agent layer abstracts the LLM provider; swap OpenAI/Azure/Anthropic
  without touching engine code.
- **Integrity by default** — the integrity engine always reports a *similarity assessment*, never a
  guarantee of zero plagiarism.

## Disclaimer

OceanFloor assists research workflows. It is **not** a clinical decision-support or diagnostic tool
and must not be used for direct patient care. All AI output requires expert human verification.
