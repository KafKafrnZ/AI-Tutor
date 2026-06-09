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
- **Backend**: FastAPI, LlamaIndex / LangChain capabilities, SQLAlchemy, PostgreSQL, ChromaDB, SSE (Server-Sent Events) for real-time streaming, Sentry Observability.
- **AI Models**: Designed to interoperate with Llama 3.3, Groq, and Gemini.

---

## ⚙️ Architecture
- **RAG Pipeline**: Retrieves factual content from a structured exam corpus (`pyqs.json` containing UPSC, SSC CGL, IBPS PO/SO/Clerk, RRB NTPC, State PSC questions) via ChromaDB semantic search.
- **Response Generation**: LLM generates streamed responses strictly grounded in the retrieved context.
- **Error Handling**: Comprehensive Sentry integration on both frontend (global-error.tsx) and backend (general_exception_handler) for robust observability.

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
See [DEPLOY.md](DEPLOY.md) for detailed instructions on deploying the application to Railway and Vercel.
