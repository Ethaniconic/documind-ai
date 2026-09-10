from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.chat_history import ChatHistoryService

router = APIRouter(tags=["history"])
history_service = ChatHistoryService()


class MessageRequest(BaseModel):
    role: str
    content: str


class RenameChatRequest(BaseModel):
    title: str


@router.post("/chats")
def create_chat(user_id: str):
    try:
        return history_service.create_chat(user_id)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.get("/chats/user/{user_id}")
def get_user_chats(user_id: str):
    return history_service.get_user_chats(user_id)


@router.get("/chats/{chat_id}")
def get_chat_history(chat_id: str):
    return history_service.get_chat_history(chat_id)


@router.patch("/chats/{chat_id}")
def rename_chat(chat_id: str, request: RenameChatRequest):
    try:
        return history_service.rename_chat(chat_id, request.title)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.delete("/chats/{chat_id}")
def delete_chat(chat_id: str):
    try:
        return history_service.delete_chat(chat_id)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))


@router.post("/chats/{chat_id}/messages")
def save_message(chat_id: str, request: MessageRequest):
    try:
        return history_service.save_message(chat_id, request.role, request.content)
    except Exception as error:
        raise HTTPException(status_code=400, detail=str(error))

