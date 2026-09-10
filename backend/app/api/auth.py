from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.auth_service import AuthService
from app.core.user_resolver import resolve_user_id, register_user

router = APIRouter(tags=["auth"])
auth_service = AuthService()


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(request: AuthRequest):
    try:
        response = auth_service.sign_up(request.email, request.password)
        user_id = str(response.user.id) if (response.user and response.user.id) else resolve_user_id(request.email)
        register_user(request.email, user_id)
        user_info = {
            "id": user_id,
            "email": response.user.email if response.user else request.email,
        }
        return {
            "status": "success",
            "user": user_info,
            "session": bool(response.session),
        }
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/login")
def login(request: AuthRequest):
    try:
        response = auth_service.login(request.email, request.password)
        user_id = str(response.user.id) if (response.user and response.user.id) else resolve_user_id(request.email)
        register_user(request.email, user_id)
        user_info = {
            "id": user_id,
            "email": response.user.email if response.user else request.email,
        }
        return {
            "status": "success",
            "access_token": response.session.access_token if response.session else None,
            "user": user_info,
        }
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
