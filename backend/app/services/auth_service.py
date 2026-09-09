from app.core.supabase_client import supabase


class AuthService:
    def sign_up(self, email: str, password: str):
        return supabase.auth.sign_up({"email": email, "password": password})

    def login(self, email: str, password: str):
        return supabase.auth.sign_in_with_password({"email": email, "password": password})