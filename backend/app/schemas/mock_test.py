from pydantic import BaseModel
from typing import Optional

class MockTestCreate(BaseModel):
    date: str
    test_name: str
    section: str
    attempted: int
    correct: int
    time_taken: float = 0.0

class MockTestResponse(BaseModel):
    id: int
    date: str
    test_name: str
    section: str
    attempted: int
    correct: int
    time_taken: float
    accuracy: Optional[float] = None

    class Config:
        from_attributes = True