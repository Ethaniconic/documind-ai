from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "DocuMind AI"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "documents"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
