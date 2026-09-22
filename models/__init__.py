from dataclasses import dataclass, field


@dataclass(frozen=True)
class Alternative:
    id: str
    text: str


@dataclass(frozen=True)
class Question:
    id: str
    prompt: str
    command: str
    alternatives: tuple[Alternative, ...]
    correct_id: str
    explanation: str
    source: dict


@dataclass(frozen=True)
class Lesson:
    id: str
    title: str
    description: str
    symbol: str
    questions: tuple[Question, ...]


@dataclass
class GameSession:
    id: str
    lesson_id: str
    index: int = 0
    answers: dict[str, str] = field(default_factory=dict)
    completed: bool = False


@dataclass(frozen=True)
class Result:
    total: int
    correct: int
    errors: int
    percentage: int
    message: str
