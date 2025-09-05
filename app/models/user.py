from pydantic import BaseModel, EmailStr
from typing import Literal


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: int
    email: str
    role: Literal["trabajador", "encargado", "admin"]