# pyrefly: ignore [missing-import]
from supabase import create_client
import os

from app.core.config import settings

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY
)