from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.document_service import DocumentService

router = APIRouter(tags=["documents"])
document_service = DocumentService()


@router.post("/documents/upload")
def upload_document(file: UploadFile = File(...), user_id: str = Form(...)):
    try:
        return document_service.upload_document(file, user_id)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/documents/user/{user_id}")
def get_user_documents(user_id: str):
    return document_service.get_user_documents(user_id)
