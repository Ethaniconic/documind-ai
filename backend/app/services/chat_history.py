from app.core.supabase_client import supabase


class ChatHistoryService:
    def create_chat(self, user_id: str):
        response = supabase.table("chats").insert({"user_id": user_id}).execute()
        return response.data[0] if response.data else None

    def get_user_chats(self, user_id: str):
        try:
            response = (
                supabase.table("chats")
                .select("*")
                .eq("user_id", user_id)
                .order("created_at", desc=True)
                .execute()
            )
            return response.data or []
        except Exception:
            return []

    def save_message(self, chat_id: str, role: str, content: str):
        message_data = {
            "chat_id": chat_id,
            "role": role,
            "content": content,
        }
        response = supabase.table("messages").insert(message_data).execute()
        return response.data[0] if response.data else None

    def get_chat_history(self, chat_id: str):
        try:
            response = (
                supabase.table("messages")
                .select("*")
                .eq("chat_id", chat_id)
                .order("created_at")
                .execute()
            )
            return response.data or []
        except Exception:
            return []
