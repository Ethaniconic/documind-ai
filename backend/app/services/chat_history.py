import json
import uuid
from datetime import datetime
from pathlib import Path
from app.core.supabase_client import supabase
from app.core.user_resolver import resolve_user_id

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)
CHATS_FILE = UPLOAD_DIR / "chats_meta.json"
MSGS_FILE = UPLOAD_DIR / "messages_meta.json"


class ChatHistoryService:
    def _load_local(self, file_path: Path) -> list:
        if file_path.exists():
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                return []
        return []

    def _save_local_chat(self, chat_data: dict):
        chats = self._load_local(CHATS_FILE)
        chats = [c for c in chats if str(c.get("id")) != str(chat_data.get("id"))]
        chats.insert(0, chat_data)
        try:
            with open(CHATS_FILE, "w", encoding="utf-8") as f:
                json.dump(chats, f, indent=2)
        except Exception as err:
            print(f"[ChatHistoryService] Error saving local chat: {err}")

    def _save_local_message(self, msg_data: dict):
        msgs = self._load_local(MSGS_FILE)
        msgs = [m for m in msgs if str(m.get("id")) != str(msg_data.get("id"))]
        msgs.append(msg_data)
        try:
            with open(MSGS_FILE, "w", encoding="utf-8") as f:
                json.dump(msgs, f, indent=2)
        except Exception as err:
            print(f"[ChatHistoryService] Error saving local message: {err}")

    def create_chat(self, user_id: str):
        uid = resolve_user_id(user_id)
        chat_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        chat_data = {
            "id": chat_id,
            "user_id": uid,
            "title": "New Chat",
            "created_at": now,
        }

        try:
            res = supabase.table("chats").insert(chat_data).execute()
            if res.data:
                chat_data = res.data[0]
        except Exception as err:
            print(f"[ChatHistoryService] Supabase create_chat note (fallback local): {err}")

        self._save_local_chat(chat_data)
        return chat_data

    def get_user_chats(self, user_id: str):
        if not user_id:
            return []
        uid = resolve_user_id(user_id)
        chats = []

        try:
            res = (
                supabase.table("chats")
                .select("*")
                .eq("user_id", uid)
                .order("created_at", desc=True)
                .execute()
            )
            if res.data:
                chats.extend(res.data)
        except Exception as err:
            print(f"[ChatHistoryService] Supabase get_user_chats note for {user_id}: {err}")

        # Merge local chats for this user
        local_chats = [
            c for c in self._load_local(CHATS_FILE)
            if resolve_user_id(str(c.get("user_id", ""))) == uid
        ]
        existing_ids = {str(c.get("id")) for c in chats}
        for lc in local_chats:
            if str(lc.get("id")) not in existing_ids:
                chats.append(lc)

        chats.sort(key=lambda c: str(c.get("created_at", "")), reverse=True)
        return chats

    def save_message(self, chat_id: str, role: str, content: str):
        msg_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        msg_data = {
            "id": msg_id,
            "chat_id": str(chat_id),
            "role": role,
            "content": content,
            "created_at": now,
        }

        try:
            res = supabase.table("messages").insert(msg_data).execute()
            if res.data:
                msg_data = res.data[0]
        except Exception as err:
            print(f"[ChatHistoryService] Supabase save_message note (fallback local): {err}")

        self._save_local_message(msg_data)
        return msg_data

    def get_chat_history(self, chat_id: str):
        cid = str(chat_id)
        messages = []

        try:
            res = (
                supabase.table("messages")
                .select("*")
                .eq("chat_id", cid)
                .order("created_at")
                .execute()
            )
            if res.data:
                messages.extend(res.data)
        except Exception as err:
            print(f"[ChatHistoryService] Supabase get_chat_history note: {err}")

        # Merge local messages for this chat
        local_msgs = [m for m in self._load_local(MSGS_FILE) if str(m.get("chat_id")) == cid]
        existing_ids = {str(m.get("id")) for m in messages}
        for lm in local_msgs:
            if str(lm.get("id")) not in existing_ids:
                messages.append(lm)

        messages.sort(key=lambda m: str(m.get("created_at", "")))

        for msg in messages:
            content = msg.get("content", "")
            if "<!-- SOURCES:" in content:
                try:
                    parts = content.split("<!-- SOURCES:")
                    msg["content"] = parts[0].rstrip()
                    sources_json = parts[1].split("-->")[0].strip()
                    msg["sources"] = json.loads(sources_json)
                except Exception:
                    pass

        return messages

    def rename_chat(self, chat_id: str, title: str):
        cid = str(chat_id)
        try:
            supabase.table("chats").update({"title": title}).eq("id", cid).execute()
        except Exception:
            pass

        chats = self._load_local(CHATS_FILE)
        for c in chats:
            if str(c.get("id")) == cid:
                c["title"] = title
        try:
            with open(CHATS_FILE, "w", encoding="utf-8") as f:
                json.dump(chats, f, indent=2)
        except Exception:
            pass

        return {"id": cid, "title": title}

    def delete_chat(self, chat_id: str):
        cid = str(chat_id)
        try:
            supabase.table("messages").delete().eq("chat_id", cid).execute()
            supabase.table("chats").delete().eq("id", cid).execute()
        except Exception:
            pass

        chats = [c for c in self._load_local(CHATS_FILE) if str(c.get("id")) != cid]
        msgs = [m for m in self._load_local(MSGS_FILE) if str(m.get("chat_id")) != cid]
        try:
            with open(CHATS_FILE, "w", encoding="utf-8") as f:
                json.dump(chats, f, indent=2)
            with open(MSGS_FILE, "w", encoding="utf-8") as f:
                json.dump(msgs, f, indent=2)
        except Exception:
            pass

        return {"success": True, "deleted_chat_id": cid}
