import sys
import os
sys.path.insert(0, os.path.dirname(__file__))
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from orchestrator import run as run_orchestrator

load_dotenv()

app = FastAPI(title="Elevatr API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- SCHEMAS ----

class QueryRequest(BaseModel):
    query: str


# ---- ORCHESTRATOR ROUTE ----

@app.post("/query")
async def query(body: QueryRequest):
    try:
        result = await run_orchestrator(
            user_id="guest",
            query=body.query,
            student_profile={},
            history=[],
        )
    except Exception as e:
        raise HTTPException(status_code=504, detail=str(e))

    return {
        "query": body.query,
        **result,
    }


# ---- HEALTH CHECK ----

@app.get("/health")
async def health():
    return {"status": "ok"}