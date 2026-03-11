from fastapi import Request, HTTPException, status
from typing import List, Callable
import logging

from app.auth.jwt_handler import verify_token

logger = logging.getLogger("sanal_lab.security.roles")

def get_current_user_payload(request: Request) -> dict:
    """Request içerisindeki JWT'yi çözer ve döner. Yoksa veya geçersizse hata fırlatır."""
    token = request.cookies.get("sanal_lab_auth")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = verify_token(token, expected_type="access")
    if not payload:
         raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


class RequireRole:
    """
    Role-Based Access Control (RBAC) Dependency'si.
    FastAPI router'larında izin verilen rolleri denetler.
    Kullanım: Depends(RequireRole(["admin", "ogretmen"]))
    """
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles
        
    def __call__(self, request: Request):
        payload = get_current_user_payload(request)
        user_role = payload.get("role", "student") # Varsayılan: öğrenci
        username = payload.get("sub", "Unknown")
        
        if user_role not in self.allowed_roles:
            logger.warning(f"Access Denied: User '{username}' with role '{user_role}' "
                           f"attempted to access restricted resource. Allowed: {self.allowed_roles}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action."
            )
        
        return payload
