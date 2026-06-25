from pydantic import BaseModel, EmailStr
from typing import Optional
import uuid


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    is_super_admin: bool = False


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    avatar_url: Optional[str] = None


class UserRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str
    is_active: bool
    is_super_admin: bool
    avatar_url: Optional[str] = None
    created_at: str = ""

    model_config = {"from_attributes": True}


class UserOperatorRoleCreate(BaseModel):
    user_id: uuid.UUID
    operator_id: uuid.UUID
    role: str  # viewer | planner | operator_admin


class UserOperatorRoleRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    operator_id: uuid.UUID
    role: str

    model_config = {"from_attributes": True}
