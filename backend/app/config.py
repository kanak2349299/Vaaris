import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Vaaris - Digital Legacy Management"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./vaaris.db")
    DATABASE_TYPE: str = os.getenv("DATABASE_TYPE", "sqlite")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "vaaris_super_secret_hackathon_jwt_key_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_NUMBER: str = os.getenv("TWILIO_WHATSAPP_NUMBER", "+14155238886")
    APP_URL: str = os.getenv("APP_URL", "http://localhost:5173")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
