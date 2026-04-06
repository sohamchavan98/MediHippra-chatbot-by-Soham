import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import chromadb

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
chroma_client = chromadb.PersistentClient(path="./chroma_db")
collection = chroma_client.get_collection("clinical_trials")

SYSTEM_PROMPT = """You are HippraMD, a clinical trials assistant for the Hippra platform.

Your job is to help patients and doctors find relevant clinical trials from the provided context.

STRICT RULES:
- Answer ONLY using the clinical trial data provided in the context below.
- If the answer is not in the context, say: "I don't have information about that in our clinical trials database. Please consult a healthcare provider."
- NEVER make up trial IDs, titles, or medical information.
- NEVER cite sources outside the provided context.
- Always mention the Trial ID (NCT number) when referencing a trial.
- Always remind users to consult a healthcare provider for personalized medical advice.
- Keep answers clear and structured.
"""

class ChatRequest(BaseModel):
    question: str
    history: list = []

def get_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding

def retrieve_trials(question, n_results=5):
    embedding = get_embedding(question)
    results = collection.query(
        query_embeddings=[embedding],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )
    return results

def build_context(results):
    context_parts = []
    for i, (doc, meta, dist) in enumerate(zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0]
    )):
        relevance = round((1 - dist) * 100, 1)
        context_parts.append(f"[Trial {i+1} — Relevance: {relevance}%]\n{doc}")
    return "\n\n---\n\n".join(context_parts)

@app.post("/chat")
def chat(request: ChatRequest):
    # Retrieve relevant trials
    results = retrieve_trials(request.question)
    context = build_context(results)

    # Build messages with history
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (last 6 messages max)
    for msg in request.history[-6:]:
        messages.append(msg)

    # Add context + current question
    messages.append({
        "role": "user",
        "content": f"Context from clinical trials database:\n\n{context}\n\n---\n\nQuestion: {request.question}"
    })

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0,        # KEY FIX: always same answer
        max_tokens=800,
    )

    answer = response.choices[0].message.content

    # Return answer + sources
    sources = [
        {
            "nct_id": meta.get("nct_id"),
            "title": meta.get("title"),
            "disease": meta.get("disease"),
            "status": meta.get("status"),
        }
        for meta in results["metadatas"][0]
    ]

    return {"answer": answer, "sources": sources}

@app.get("/health")
def health():
    return {"status": "ok", "trials_loaded": collection.count()}