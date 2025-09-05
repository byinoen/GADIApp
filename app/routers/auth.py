from fastapi import APIRouter, HTTPException, status
from app.models.user import UserLogin, UserPublic

router = APIRouter(prefix="/auth", tags=["authentication"])

# In-memory user database with Spanish roles
USERS_DB = {
    "trabajador@example.com": {"id": 1, "password": "1234", "role": "trabajador"},
    "encargado@example.com": {"id": 2, "password": "1234", "role": "encargado"},
    "admin@example.com": {"id": 3, "password": "1234", "role": "admin"},
}


@router.post("/login")
def login(user_login: UserLogin):
    user_data = USERS_DB.get(user_login.email)
    
    if not user_data or user_data["password"] != user_login.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas"
        )
    
    user_public = UserPublic(
        id=user_data["id"],
        email=user_login.email,
        role=user_data["role"]
    )
    
    return {
        "token": "demo",
        "user": user_public.model_dump()
    }