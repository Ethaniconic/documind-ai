from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.auth_service import AuthService

router = APIRouter(tags=["auth"])
auth_service = AuthService()


class AuthRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(request: AuthRequest):
    try:
        response = auth_service.sign_up(request.email, request.password)
        return {
            "status": "success",
            "user": response.user,
            "session": response.session,
        }
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/login")
def login(request: AuthRequest):
    try:
        response = auth_service.login(request.email, request.password)
        return {
            "status": "success",
            "access_token": response.session.access_token if response.session else None,
            "user": response.user,
        }
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
