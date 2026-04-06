# HippraMD Chatbot By Soham

A clinical trials assistant for the Hippra platform built with:
- **Frontend:** React + Vite
- **Backend:** FastAPI + ChromaDB + OpenAI
- **Data:** 840 clinical trials across 7 diseases

## Setup

### Backend
```bash
cd backend
pip install -r requirements.txt
python ingest.py
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```