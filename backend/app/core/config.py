from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Database
    # Database
    MONGODB_URL: str  # Required — must be set in .env
    DATABASE_NAME: str = "learnly_db"
    
    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production-min-32-chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Google OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"
    
    # Groq (Fast Inference)
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-8b-instant" # Faster for quizzes to avoid timeouts
    
    # File Upload
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    ALLOWED_EXTENSIONS: list = [".pdf", ".docx", ".txt", ".md", ".xlsx", ".xls", ".pptx", ".ppt", ".csv"]
    
    # Vector Store & RAG
    VECTOR_STORE_PATH: str = "vector_stores"
    # Chunk sizes are now DYNAMIC (auto-calculated based on document)
    # These values are fallback defaults only
    CHUNK_SIZE: int = 600  # Fallback only - actual size is 400-1800 (dynamic)
    CHUNK_OVERLAP: int = 100  # Fallback only - actual overlap is auto-calculated
    DEFAULT_CHUNKING_STRATEGY: str = "auto"  # auto, naive, semantic, hierarchical, table
    FRONTEND_URL: str = "http://localhost:3000"  # For generating links
    
    GROQ_API_KEY: Optional[str] = None
    GROQ_MODEL: str = "llama-3.1-8b-instant" # Faster for quizzes to avoid timeouts
    # GEMINI_API_KEY removed

    
    # Hugging Face (Free Inference)
    HUGGINGFACE_API_KEY: Optional[str] = None
    HUGGINGFACE_EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    
    # Moderation
    MODERATION_THRESHOLD: float = 0.7
    
    # Email
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@learnly.com"
    FRONTEND_URL: str = "http://localhost:3000"  # For generating links
    
    class Config:
        env_file = ".env" if os.path.exists(".env") else "../.env"
        # Search path for .env file (current dir, then parent)
        env_file_encoding = 'utf-8'
        case_sensitive = True
        extra = "ignore"  # Ignore variables not in the model (e.g. VITE_*)

settings = Settings()
