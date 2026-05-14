import requests
import os
import json

# ====================== CONFIG ======================
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
CLOUD_MODEL = "llama-3.3-70b-versatile"

OLLAMA_URL = "http://localhost:11434/api/generate"
LOCAL_MODEL = "phi3"

# ====================== CORE PROMPTS ======================

def ask_tutor(question: str, context: str = ""):
    system_prompt = f"""You are **IBPS SO AI Tutor** — an elite, patient, and highly knowledgeable government exam mentor.
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

Use `code blocks` only for formulas or code. Use `inline backticks` for terms.

Context from Previous Year Questions:
{context}

Student Question: {question}
"""

    # Try Cloud first
    result = run_cloud_model(system_prompt, temperature=0.3)
    
    if "Cloud Engine Error" in result or len(result) < 50:
        print("⚠️ Cloud failed → Falling back to Local (Ollama)")
        result = run_local_model(system_prompt, temperature=0.4)
    
    return result

def evaluate_answer(question: str, student_answer: str, context: str = ""):
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
    return run_cloud_model(system_prompt, temperature=0.2)

def generate_questions(topic: str):
    system_prompt = f"""You are a top IBPS SO trainer. Generate exactly 30 multiple-choice questions on "{topic}".

Rules:
- Mix the difficulties: 10 Easy, 10 Medium, 10 Hard.
- Exactly 4 options per question.
- Output MUST be a pure JSON array of objects. Do not include markdown blocks like ```json.
- Each object MUST match this exact schema:
  {{"difficulty": "Easy", "question": "...", "options": ["...", "...", "...", "..."], "correct_answer": "...", "explanation": "..."}}

Output ONLY the raw JSON array. Any other text will crash the system."""

    result = run_cloud_model(system_prompt, temperature=0.2, max_tokens=6000)
    
    # Bulletproof JSON extraction
    cleaned = result.strip()
    if "```" in cleaned:
        cleaned = cleaned.split("```")[-2] if len(cleaned.split("```")) > 1 else cleaned
    if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].strip()
        
    start = cleaned.find('[')
    end = cleaned.rfind(']') + 1
    if start != -1 and end > start:
        cleaned = cleaned[start:end]
    
    return cleaned


# ====================== ENGINE FUNCTIONS ======================

def run_cloud_model(prompt: str, temperature: float = 0.25, max_tokens: int = 2048):
    if not GROQ_API_KEY:
        return "Cloud Engine Error: GROQ_API_KEY is missing from .env"
    
    try:
        response = requests.post(
            GROQ_URL,
            headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
            json={
                "model": CLOUD_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens
            },
            timeout=75
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]
    except Exception as e:
        return f"Cloud Engine Error: {str(e)}"

def run_local_model(prompt: str, temperature=0.4):
    try:
        response = requests.post(
            OLLAMA_URL,
            json={"model": LOCAL_MODEL, "prompt": prompt, "stream": False, "temperature": temperature},
            timeout=120
        )
        response.raise_for_status()
        return response.json().get("response", "No response from local model.")
    except Exception as e:
        return f"Local Engine Error: {str(e)}"