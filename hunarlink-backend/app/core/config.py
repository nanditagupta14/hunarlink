import os
from pathlib import Path
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv

# Search and load environment variables from backend directory and root directory
_backend_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(_backend_dir / ".env")
load_dotenv(_backend_dir.parent / ".env")
load_dotenv()

class Settings(BaseModel):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    APP_NAME: str = os.getenv("APP_NAME", "HunarLink API")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    
    # Default to local SQLite file for immediate out-of-the-box operation, can be overridden with postgresql:// in .env
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./hunarlink.db")
    
    CLERK_PUBLISHABLE_KEY: str = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_WEBHOOK_SIGNING_SECRET: str = os.getenv("CLERK_WEBHOOK_SIGNING_SECRET", "")
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8123",
        "http://127.0.0.1:8123"
    ]

settings = Settings()

