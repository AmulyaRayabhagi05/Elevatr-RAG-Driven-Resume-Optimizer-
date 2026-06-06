from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from modules.job_searchv2 import run_job_search

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class JobSearchRequest(BaseModel):
    skills: list[str] = []
    major: str = ""
    coursework: list[str] = []
    location_preference: list[str] = []
    target_role: str = ""

@app.post("/job-search")
def job_search(body: JobSearchRequest):
    return run_job_search(body.dict())