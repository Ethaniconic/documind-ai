from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.upload_service import service

router = APIRouter(prefix="/upload", tags=["upload"])


@router.post("/")
async def upload_doc(file: UploadFile = File(...)):
    result = await service(file)
    return {
        "status": "success",
        "message": "File uploaded successfully",
        "data": result
    }