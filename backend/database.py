import os
import json
import redis.asyncio as redis
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.server_api import ServerApi
from dotenv import load_dotenv, find_dotenv
from typing import List, Dict, Optional
from bson import ObjectId


class RedisChatMemory: 
    def __init__(self, host: str, port: int, user: str, passwd: str):
        self.client = redis.Redis(
            host=host,
            port=port,
            decode_responses=True,
            username=user,
            password=passwd
        )
    
        
    async def add_message(self, user_id:str, role: str, message: str , limit = 15):
        key = f"History: {user_id}"
        value = json.dumps({
            "role": role,
            "message": message
        })
        async with self.client.pipeline() as pipe: 
            await pipe.rpush(key, value)
            await pipe.ltrim(key, -limit, -1)
            await pipe.expire(key, 3600)
            await pipe.execute()
        
    async def get_history(self, user_id:str) -> List[Dict]:
        key = f"History: {user_id}"
        history = await self.client.lrange(key, 0, -1)
        return [json.loads(msg) for msg in history]

class MongoChatMemory:
    def __init__(self, mongo_db: "MongoDB"):
        self.mongo = mongo_db

    async def add_message(self, user_id: str, role: str, message: str):
        if self.mongo.db is None:
            raise RuntimeError("MongoDB is not connected")

        await self.mongo.db["chat_history"].insert_one({
            "user_id": user_id,
            "role": role,
            "message": message,
            "created_at": datetime.utcnow(),
        })

    async def get_history(self, user_id: str) -> List[Dict]:
        if self.mongo.db is None:
            return []

        cursor = self.mongo.db["chat_history"].find({"user_id": user_id}).sort("created_at", 1)
        docs = await cursor.to_list(length=1000)
        return [{"role": doc.get("role", "human"), "message": doc.get("message", "")} for doc in docs]

    async def clear_history(self, user_id: str):
        if self.mongo.db is None:
            return

        await self.mongo.db["chat_history"].delete_many({"user_id": user_id})

class MongoDB: 
    def __init__(self, uri: str, db_name: str):
        self.uri = uri
        self.db_name = db_name
        self.client = None
        self.db = None
    
    async def connect(self):
        self.client = AsyncIOMotorClient(self.uri, server_api=ServerApi('1'))
        self.db = self.client[self.db_name]

    
    async def register(self, name: str, email: str, password: str):
        result = await self.db["user"].insert_one({
            "name": name,
            "email": email,
            "password": password,
            "created_at": datetime.utcnow(),
        })
        
        await self.db["student_profile"].insert_one({
            "user_id": str(result.inserted_id),
            "name": name,
            "email": email,
            "major": "",
            "gpa": 0.0,
            "gre": None,
            "sop": "",
            "resumeText": "",
            "resumeFileName": None,
            "skills": [],
            "experience": "",
            "projects": "",
            "coursework": [],
            "location_preference": [],
            "target_job": "",
            "current_org": "",
            "current_role": "",
            # Raw structured data for resume generation
            "phone": None,
            "linkedin": None,
            "github": None,
            "location": None,
            "education": [],
            "experience_raw": [],
            "projects_raw": [],
            "certifications": [],
            "achievements": [],
            "leadership": [],
        })
        return result
    
    async def get_user_by_email(self, email: str):
        user = await self.db["user"].find_one({"email": email})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    async def get_user_by_id(self, user_id: str):
        user = await self.db["user"].find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
        return user
    
    async def get_profile(self, user_id: str):
        profile = await self.db["student_profile"].find_one({"user_id": user_id})
        if not profile:
            return None

        # Strip MongoDB internals and return only frontend-facing fields
        return {
            "name": profile.get("name", ""),
            "email": profile.get("email", ""),
            "major": profile.get("major", ""),
            "gpa": profile.get("gpa", 0.0),
            "gre": profile.get("gre", None),
            "sop": profile.get("sop", ""),
            "resumeText": profile.get("resumeText", ""),
            "resumeFileName": profile.get("resumeFileName", None),
            "skills": profile.get("skills", []),
            "experience": profile.get("experience", ""),
            "projects": profile.get("projects", ""),
            "coursework": profile.get("coursework", []),
            "location_preference": profile.get("location_preference", []),
            "target_job": profile.get("target_job", ""),
            "current_role": "ERP Security Administrator",
            "current_org":  "UTDallas Office of Technology",
            # Raw structured data for resume generation
            "phone": profile.get("phone", None),
            "linkedin": profile.get("linkedin", None),
            "github": profile.get("github", None),
            "location": profile.get("location", None),
            "education": profile.get("education", []),
            "experience_raw": profile.get("experience_raw", []),
            "projects_raw": profile.get("projects_raw", []),
            "certifications": profile.get("certifications", []),
            "achievements": profile.get("achievements", []),
            "leadership": profile.get("leadership", []),
        }
    
    async def update_profile(self, user_id: str, profile: dict):
        # Remove MongoDB internal fields if accidentally passed in
        profile.pop("_id", None)
        profile.pop("user_id", None)

        await self.db["student_profile"].update_one(
            {"user_id": user_id},
            {"$set": profile}
        )

    # ── Job search results ─────────────────────────────────────────────────────

    async def get_job_by_id(self, job_id: str) -> Optional[Dict]:
        """
        Look up a job from job_search_results by its job_id field.
        The job_id is the string stored in the jobs array (e.g. "ARS-DH26-..."),
        not the MongoDB _id.
        """
        doc = await self.db["job_search_results"].find_one(
            {"jobs.job_id": job_id},
            {"jobs.$": 1}  # return only the matching element
        )
        if doc and doc.get("jobs"):
            return doc["jobs"][0]
        return None

    # ── Tailored resumes ───────────────────────────────────────────────────────

    async def save_tailored_resume(
        self,
        user_id: str,
        job_id: str,
        job_title: str,
        job_company: str,
        tailored_data: dict,
        pdf_bytes: bytes,
    ) -> None:
        """
        Upsert a tailored resume document into the tailored_resumes collection.
        Stores the full tailored resume data + the raw PDF bytes + metadata.
        Keyed on user_id + job_id so re-tailoring the same job overwrites the old one.
        """
        await self.db["tailored_resumes"].update_one(
            {"user_id": user_id, "job_id": job_id},
            {
                "$set": {
                    "user_id": user_id,
                    "job_id": job_id,
                    "job_title": job_title,
                    "job_company": job_company,
                    "tailored_data": tailored_data,
                    "pdf_bytes": pdf_bytes,
                    "created_at": datetime.utcnow(),
                }
            },
            upsert=True,
        )

    async def get_tailored_resume(self, user_id: str, job_id: str) -> Optional[Dict]:
        """
        Retrieve a previously tailored resume by user + job.
        Returns the full document (including pdf_bytes) or None.
        """
        doc = await self.db["tailored_resumes"].find_one(
            {"user_id": user_id, "job_id": job_id}
        )
        return doc


load_dotenv(find_dotenv())

mongo = MongoDB(os.getenv("MONGO_URI"), os.getenv("DB_NAME"))
memory = MongoChatMemory(mongo)