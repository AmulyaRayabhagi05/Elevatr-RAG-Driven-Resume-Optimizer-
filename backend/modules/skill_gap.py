import os
import sys
import asyncio
import chromadb
from typing import List, Dict, Any
from pydantic import BaseModel
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# --- 1. ENVIRONMENT & PATH SETUP ---
base_dir = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(base_dir, "..", "..", ".env"))

# --- 2. DATABASE CONNECTION ---
try:
    from backend.database import mongo
    db = mongo.db
except Exception:
    db = None

if db is None:
    uri = os.getenv("MONGO_URI")
    if uri:
        try:
            client = AsyncIOMotorClient(uri)
            db = client["elevatr_db"] 
        except Exception:
            pass

# --- 3. DATA MODELS ---
class GapItem(BaseModel):
    skill: str
    gap_score: float = 1.0
    description: str

class CourseRec(BaseModel):
    course: str
    platform: str
    url: str

class SkillGapResponse(BaseModel):
    module: str = "skill_gap"
    target_occupation: str
    gaps: List[GapItem]
    recommendations: List[CourseRec]

# --- 4. THE ANALYZER ---
class SkillGapAnalyzer:
    def __init__(self):
        root_path = os.path.abspath(os.path.join(base_dir, ".."))
        self.chroma_path = os.path.join(root_path, "rag", "ingestion", "chroma_db")
        
        if not os.path.exists(self.chroma_path):
            self.chroma_path = os.path.join(os.path.abspath(os.path.join(base_dir, "..", "..")), "chroma_db")
            
        try:
            self.chroma_client = chromadb.PersistentClient(path=self.chroma_path)
        except Exception:
            self.chroma_client = None

    async def get_onet_requirements(self, job_title: str) -> List[str]:
        """Fetch required skills from MongoDB 'all_job_posts'."""
        if db is not None:
            try:
                collection = db["all_job_posts"]
                job_data = await collection.find_one({"title": {"$regex": job_title, "$options": "i"}})
                if job_data and "skills" in job_data:
                    return job_data["skills"][:6]
            except Exception:
                pass
        
        # Fallbacks if DB query fails
        fallbacks = {
            "Software": ["Python", "System Design", "Git", "Docker", "REST APIs"],
            "Cloud": ["AWS", "Terraform", "Kubernetes", "Linux", "Networking"],
            "Data": ["SQL", "Pandas", "Machine Learning", "Tableau", "Data Cleaning"]
        }
        for key, skills in fallbacks.items():
            if key.lower() in job_title.lower(): return skills
        return ["Python", "Technical Communication", "Agile", "Problem Solving"]

    async def find_course_recommendations(self, missing_skill: str) -> List[CourseRec]:
        """Matches skills against the MongoDB Array and ChromaDB."""
        recommendations = []
        
        # 1. MongoDB Course Search (Updated for your specific Schema)
        if db is not None:
            try:
                course_col = db["courses"]
                # Using $in to search within the skills Array seen in your screenshot
                query = {"skills": {"$regex": f"^{missing_skill}$", "$options": "i"}}
                direct_matches = await course_col.find(query).limit(2).to_list(length=2)

                for c in direct_matches:
                    recommendations.append(CourseRec(
                        course=c.get("course_name", "Professional Training"),
                        platform=c.get("university", "Coursera"),
                        url=c.get("course_url", "https://www.coursera.org")
                    ))
            except Exception:
                pass

        # 2. ChromaDB Vector Search (Semantic Fallback)
        if len(recommendations) < 2 and self.chroma_client:
            try:
                collection = self.chroma_client.get_collection(name="elevatr_index")
                results = collection.query(query_texts=[f"Learning {missing_skill}"], n_results=2)
                
                if results and results['metadatas'] and results['metadatas'][0]:
                    for meta in results['metadatas'][0]:
                        title = meta.get("title") or meta.get("course_name")
                        if title and not any(r.course == title for r in recommendations):
                            recommendations.append(CourseRec(
                                course=title,
                                platform=meta.get("source") or meta.get("university", "Coursera"),
                                url=meta.get("url") or meta.get("course_url", "https://www.coursera.org")
                            ))
            except Exception:
                pass

        # 3. Emergency Generator (The Demo-Saver)
        if not recommendations:
            recommendations.append(CourseRec(
                course=f"Mastering {missing_skill} Specialization",
                platform="Coursera",
                url=f"https://www.coursera.org/search?query={missing_skill.replace(' ', '%20')}"
            ))

        return recommendations[:1]

    async def run_analysis(self, query: str, student_profile: Dict[str, Any]) -> SkillGapResponse:
        target_job = query if len(query) > 10 else student_profile.get("target_job", "Software Engineer")
        required_skills = await self.get_onet_requirements(target_job)
        student_skills = [str(s).lower() for s in student_profile.get("skills", [])]
        
        gaps = []
        all_recs = []

        for skill in required_skills:
            if skill.lower() not in student_skills:
                gaps.append(GapItem(skill=skill, description=f"Critical for {target_job} roles."))
                recs = await self.find_course_recommendations(skill)
                all_recs.extend(recs)
            if len(gaps) >= 4: break

        return SkillGapResponse(target_occupation=target_job, gaps=gaps, recommendations=all_recs[:5])

# --- 5. WRAPPER ---
async def run_skill_gap_module(query: str, student_profile: Dict[str, Any]):
    analyzer = SkillGapAnalyzer()
    result = await analyzer.run_analysis(query, student_profile)
    return result.model_dump()

if __name__ == "__main__":
    test_profile = {"skills": ["Python"], "target_job": "Software Engineer"}
    res = asyncio.run(run_skill_gap_module("Software Engineer", test_profile))
    import json
    print(json.dumps(res, indent=2))