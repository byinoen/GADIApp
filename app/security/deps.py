from fastapi import HTTPException, status, Header, Depends
from typing import Optional, List
from app.models.user import UserPublic

# Simulated user database for demo tokens
DEMO_USERS = {
    "admin": UserPublic(id=3, email="admin@example.com", role="admin"),
    "encargado": UserPublic(id=2, email="encargado@example.com", role="encargado"),
    "trabajador": UserPublic(id=1, email="trabajador@example.com", role="trabajador"),
}

# Role mapping for Spanish access control
ROLE_MAPPING = {
    "admin": "Administrador",
    "encargado": "Encargado", 
    "trabajador": "Trabajador"
}


def get_current_user(x_demo_token: Optional[str] = Header(None)) -> UserPublic:
    """Extract user from X-Demo-Token header"""
    if not x_demo_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token requerido"
        )
    
    user = DEMO_USERS.get(x_demo_token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido"
        )
    
    return user


def require_roles(*required_roles: str):
    """Dependency factory for role-based access control"""
    def role_dependency(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
        user_spanish_role = ROLE_MAPPING.get(current_user.role)
        
        if user_spanish_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permiso denegado"
            )
        
        return current_user
    
    return role_dependency