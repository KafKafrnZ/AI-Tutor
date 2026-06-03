import httpx
import os
import json
import logging
from typing import AsyncGenerator

from modules.rag import load_pyqs, initialize_rag, search_pyqs

logger = logging.getLogger(__name__)

# ====================== CONFIG ======================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CLOUD_MODEL = "llama-3.3-70b-versatile"

OLLAMA_URL = "http://localhost:11434/api/generate"
LOCAL_MODEL = "phi3"

# ====================== HTTP CONNECTION POOL (FIX-14) ======================
_http_client: httpx.AsyncClient | None = None

def get_http_client() -> httpx.AsyncClient:
    """Returns a shared, reusable HTTP client to prevent connection churn."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(timeout=75.0)
    return _http_client

# ====================== CORE PROMPTS ======================

def build_tutor_prompt(question: str, context: str = "") -> str:
    return f"""You are **IBPS SO AI Tutor** - an elite, patient, and highly knowledgeable government exam mentor.
You teach like the best coaching faculty in India.

**CRITICAL RULES:**
- Never hallucinate. If unsure, say "I need more context" or "This is beyond standard syllabus".
- Always be extremely clear, structured, and exam-oriented.
- Use simple language mixed with technical terms.
- Highlight shortcuts, common mistakes, and previous year trends.

**RESPONSE FORMAT (Strict):**
**1. Concept Explanation**
**2. Step-by-Step Solution**
**3. Smart Shortcut / Trick**
**4. Exam Relevance & PYQ Trend**
**5. Final Answer**

**When using Context from Previous Year Questions, cite them briefly** (e.g. "As seen in 2023 IT Networking PYQ...").

Use `code blocks` only for formulas or code. Use `inline backticks` for terms.

Context from Previous Year Questions:
{context}

Student Question: {question}
"""


def _build_rag_context(question: str) -> str:
    """Shared helper (removes duplication between ask_tutor and ask_tutor_stream).
    Returns formatted previous-year citations with subject/year for prompt + auditability.
    """
    try:
        pyqs = load_pyqs()
        index, pyqs = initialize_rag(pyqs)
        results = search_pyqs(question, pyqs, index, top_k=3)
        if not results:
            return ""
        logger.info("RAG: injected %d PYQ citation(s) for query (subjects: %s)", len(results), [r['data'].get('subject') for r in results])
        return "\n\n".join([
            f"PYQ (Subject: {r['data'].get('subject', 'General')}, Year: {r['data'].get('year', 'N/A')}):\nQuestion: {r['data'].get('question', '')}\nCorrect Answer: {r['data'].get('correct_answer', '')}"
            for r in results
        ])
    except Exception as e:
        logger.error("RAG pipeline error: %s", e, exc_info=True)
        return "No previous year context available."


async def ask_tutor(question: str, context: str = "") -> str:
    if not context:
        context = _build_rag_context(question)

    system_prompt = build_tutor_prompt(question, context)

    result = await run_cloud_model(system_prompt, temperature=0.3)

    if "Cloud Engine Error" in result or len(result) < 50:
        logger.warning("Cloud model failed, falling back to local Ollama")
        result = await run_local_model(system_prompt, temperature=0.4)

    return result

async def ask_tutor_stream(question: str, context: str = "") -> AsyncGenerator[str, None]:
    """Asynchronous generator that yields tokens in real-time for SSE streaming."""
    if not context:
        context = _build_rag_context(question)

    system_prompt = build_tutor_prompt(question, context)

    async for token in run_cloud_model_stream(system_prompt, temperature=0.3):
        yield token

async def evaluate_answer(question: str, student_answer: str, context: str = "") -> str:
    system_prompt = f"""You are a strict but fair IBPS SO Examiner.

**TASK**: Evaluate the student's answer with high precision.

**RESPONSE FORMAT (Strict):**
**1. Correct Approach**
**2. Student's Mistakes (with explanation)**
**3. Better/Faster Method**
**4. Score out of 10 + Detailed Feedback**
**5. Key Takeaway**

Reference Context:
{context}

Question: {question}
Student Answer: {student_answer}
"""
    return await run_cloud_model(system_prompt, temperature=0.2)

async def generate_questions(topic: str) -> str:
    system_prompt = f"""You are a top IBPS SO trainer. Generate exactly 30 multiple-choice questions on "{topic}".

Rules:
- Mix the difficulties: 10 Easy, 10 Medium, 10 Hard.
- Exactly 4 options per question.
- Output MUST be a pure JSON array of objects. Do not include markdown blocks like ```json.
- Each object MUST match this exact schema:
  {{"difficulty": "Easy", "question": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "..."}}

Output ONLY the raw JSON array. Any other text will crash the system."""

    result = await run_cloud_model(system_prompt, temperature=0.2, max_tokens=6000)

    # Bulletproof JSON extraction
    cleaned = result.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[-2] if len(cleaned.split("```")) > 1 else cleaned
    if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].strip()

    start = cleaned.find("[")
    end = cleaned.rfind("]") + 1
    if start != -1 and end > start:
        cleaned = cleaned[start:end]

    return cleaned

# ====================== ASYNC ENGINE FUNCTIONS ======================

async def run_cloud_model(prompt: str, temperature: float = 0.25, max_tokens: int = 2048) -> str:
    if not GROQ_API_KEY:
        return "Cloud Engine Error: GROQ_API_KEY is missing from .env"

    client = get_http_client() # FIX-14: Reusing global client
    try:
        response = await client.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": CLOUD_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
            }
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Cloud Engine Error: {str(e)}"

async def run_cloud_model_stream(
    prompt: str, temperature: float = 0.25, max_tokens: int = 2048
) -> AsyncGenerator[str, None]:
    if not GROQ_API_KEY:
        yield "Cloud Engine Error: GROQ_API_KEY is missing from .env"
        return

    client = get_http_client() # FIX-14: Reusing global client
    try:
        async with client.stream(
            "POST",
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": CLOUD_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            }
        ) as response:
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        data_json = json.loads(data_str)
                        token = data_json["choices"][0]["delta"].get("content", "")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue
    except Exception as e:
        yield f"Streaming Error: {str(e)}"

async def run_local_model(prompt: str, temperature: float = 0.4) -> str:
    client = get_http_client() # FIX-14: Reusing global client
    try:
        response = await client.post(
            OLLAMA_URL,
            json={
                "model": LOCAL_MODEL,
                "prompt": prompt,
                "stream": False,
                "temperature": temperature,
            }
        )
        response.raise_for_status()
        return response.json().get("response", "No response from local model.")
    except Exception as e:
        return f"Local Engine Error: {str(e)}"