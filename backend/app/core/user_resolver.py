import uuid
from app.core.supabase_client import supabase

_user_cache = {}


def ensure_public_user(user_id: str, email: str = None):
    """Ensures user exists in public.users to satisfy foreign key constraints."""
    if user_id:
        try:
            data = {"id": str(user_id)}
            if email:
                data["email"] = email
            supabase.table("users").upsert(data).execute()
        except Exception:
            pass


def register_user(identifier: str, user_id: str):
    """Explicitly associates an identifier (email, username) with a resolved UUID."""
    if identifier and user_id:
        s_id = str(identifier).strip()
        s_uid = str(user_id).strip()
        _user_cache[s_id] = s_uid
        _user_cache[s_id.lower()] = s_uid
        _user_cache[s_uid] = s_uid
        ensure_public_user(s_uid, s_id if "@" in s_id else None)


def resolve_user_id(identifier: str) -> str:
    """
    Normalizes any user identifier (UUID, email, or demo username) 
    into a consistent, valid UUID string that PostgreSQL accepts.
    """
    if not identifier:
        return ""

    ident_str = str(identifier).strip()
    ident_lower = ident_str.lower()
    if ident_str in _user_cache:
        return _user_cache[ident_str]
    if ident_lower in _user_cache:
        return _user_cache[ident_lower]

    # If it contains '@', resolve to the Supabase auth UUID
    if "@" in ident_str:
        try:
            users = supabase.auth.admin.list_users()
            for u in users:
                if u.email and u.email.lower() == ident_lower:
                    uid = str(u.id)
                    register_user(ident_str, uid)
                    return uid
        except Exception:
            pass

    # Check if already a valid UUID
    try:
        val = str(uuid.UUID(ident_str))
        register_user(ident_str, val)
        return val
    except (ValueError, AttributeError):
        # Deterministic UUID for demo/guest account names
        deterministic_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, ident_lower))
        register_user(ident_str, deterministic_uuid)
        return deterministic_uuid
