from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List
from modules.grad_school import GradSchoolPrep
from auth import get_current_user         
from database import mongo       

router = APIRouter(prefix="/grad", tags=["grad"])

class GradSearchRequest(BaseModel):
    major: str
    gpa: float
    gre: int = 0
    coursework: List[str] = []

@router.post("/search")
async def search_grad_programs(
    body: GradSearchRequest,
    user_id: str = Depends(get_current_user)
  ):
    module = GradSchoolPrep()
    results = await module.run(body.dict())
    return { "programs": results }