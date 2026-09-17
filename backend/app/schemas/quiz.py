from enum import Enum

from pydantic import BaseModel, Field, model_validator


class Difficulty(str, Enum):
    EASY = "Easy"
    MEDIUM = "Medium"
    HARD = "Hard"


class QuizQuestion(BaseModel):
    difficulty: Difficulty
    question: str
    options: list[str] = Field(min_length=4, max_length=4)
    correct_answer: str
    explanation: str

    @model_validator(mode="after")
    def correct_answer_in_options(self) -> "QuizQuestion":
        if self.correct_answer not in self.options:
            raise ValueError("correct_answer must be exactly one of the 4 options")
        return self
