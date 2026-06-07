# Ascend AI Tutor 🚀
An immersive, production-grade AI Tutoring application designed specifically for Indian Government & Banking Exams (IBPS SO, UPSC, State PSC). 

## 🌟 The "Wow Factor" Features

1. **3D Knowledge Universe**
   - Built with `@react-three/fiber` and `@react-three/drei`.
   - Explore an interactive, floating node graph of the entire syllabus. Complete with custom shaders, particle systems, and glassmorphic tooltips.
   - Navigate to `/explore` to experience it.

2. **Native Voice Interface**
   - Seamless, zero-latency Web Speech API integration.
   - Beautiful, `framer-motion` powered microphone animations (concentric pulsing glow rings).
   - Zero additional API costs. Talk directly to your AI Tutor.

3. **LangGraph Agentic RAG (Backend)**
   - Moving beyond standard "dumb" RAG, this repository features scaffolding for **LangGraph** driven agentic workflows.
   - Nodes for `retrieve`, `generate`, and `evaluate` ensure that the AI cross-checks its own answers against hallucination before returning a response.

4. **Progressive Web App (PWA)**
   - Installable on mobile devices via Chrome/Safari.
   - `manifest.json` configured for a native-app-like experience.

5. **Premium UI/UX & Glassmorphism**
   - Complete visual overhaul using brand colors: Deep Space Background (`#050810`), Neon Cyan (`#00D4FF`), and Electric Violet (`#8B5CF6`).
   - Extensive use of Tailwind's `backdrop-blur` for heavy glassy overlays, creating incredible depth.

---

## 🛠 Tech Stack
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Zustand, Framer Motion, React Three Fiber.
- **Backend**: FastAPI, LangChain, LangGraph, SQLAlchemy, PostgreSQL, SSE (Server-Sent Events) for real-time streaming.
- **AI Models**: Designed to interoperate with Llama 3, Groq, and Gemini.

---

## 🚀 Getting Started

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📜 Architecture Updates
This repository has had its technical debt resolved (Phase 0), UI/UX overhauled (Phase 1), advanced LangGraph scaffolding added (Phase 2), and PWA/Documentation polished (Phase 3). 
