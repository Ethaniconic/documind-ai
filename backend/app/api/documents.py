from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query
from typing import Optional
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


@router.delete("/documents/{document_id}")
def delete_document(document_id: str, user_id: Optional[str] = Query(None)):
    try:
        return document_service.delete_document(document_id, user_id)
    except PermissionError as perm_err:
        raise HTTPException(status_code=403, detail=str(perm_err))
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))
