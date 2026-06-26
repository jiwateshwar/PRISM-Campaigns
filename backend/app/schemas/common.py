from pydantic import BaseModel
from typing import Any
import uuid


class PaginatedResponse(BaseModel):
    items: list[Any]
    total: int
    page: int
    size: int
    pages: int


class MessageResponse(BaseModel):
    message: str


class IDResponse(BaseModel):
    id: uuid.UUID
