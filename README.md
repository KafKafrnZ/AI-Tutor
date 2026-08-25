# Ascend AI Tutor 🚀
An immersive, production-grade AI Tutoring application designed specifically for Indian government exams (UPSC, SSC CGL, IBPS PO/SO/Clerk, RRB NTPC, State PSC). 

## 🌟 Features

1. **3D Knowledge Universe**
   - Built with `@react-three/fiber` and `@react-three/drei`.
   - Explore an interactive, floating node graph of the entire syllabus. Complete with custom shaders, particle systems, and glassmorphic tooltips.
   - Navigate to `/explore` to experience it.

2. **Native Voice Interface**
   - Seamless, zero-latency Web Speech API integration.
   - Beautiful, `framer-motion` powered microphone animations (concentric pulsing glow rings).
   - Zero additional API costs. Talk directly to your AI Tutor.

3. **RAG-Augmented LLM Pipeline (Backend)**
   - Features a robust RAG-augmented LLM pipeline: user question → ChromaDB retrieval → context injection → Llama 3.3 stream.

4. **Progressive Web App (PWA)**
   - Installable on mobile devices via Chrome/Safari.
   - `manifest.json` configured for a native-app-like experience.

5. **Premium UI/UX & Glassmorphism**
   - Complete visual overhaul using brand colors: Deep Space Background (`#050810`), Neon Cyan (`#00D4FF`), and Electric Violet (`#8B5CF6`).
   - Extensive use of Tailwind's `backdrop-blur` for heavy glassy overlays, creating incredible depth.

---

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand, Framer Motion, React Three Fiber.
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, Alembic, ChromaDB + fastembed (RAG), Redis, structlog, slowapi, Sentry.
- **AI Models**: Llama 3.3 via Groq API — streamed responses with SSE.

---

## ⚙️ Architecture
- **RAG Pipeline**: Retrieves factual content from a structured exam corpus (`pyqs.json` — UPSC, SSC CGL, IBPS PO/SO/Clerk, RRB NTPC, State PSC) via ChromaDB semantic search + fastembed embeddings.
- **Response Generation**: Llama 3.3 via Groq API generates streamed responses grounded in the retrieved context.
- **Auth**: httpOnly JWT cookies with 1-hour access tokens + 30-day refresh token rotation. CSRF protection via Origin/Referer validation.
- **Error Handling**: Sentry integration on both frontend (`global-error.tsx`) and backend (`general_exception_handler`). Structured JSON logging with X-Request-ID correlation.

---

## 📦 License

[MIT](LICENSE)

---

## 🚀 Getting Started

To spin up the entire stack locally using Docker:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
docker compose up --build
```
This boots up the PostgreSQL database, the ChromaDB vector store, the FastAPI backend (and auto-ingests the `pyqs.json` data), and the Next.js frontend.

---

## 🚀 Deploy
See [DEPLOY.md](DEPLOY.md) for Railway + Vercel.

What is still required before this is a shippable, paid product: [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md).
