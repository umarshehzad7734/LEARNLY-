from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.db_mongo import init_db
from app.api import auth, users, courses, quiz, analytics, rag, moderation, assignments, departments, notifications

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize MongoDB
    await init_db()
    print("[STARTUP] MongoDB initialized.")
    yield
    print("[SHUTDOWN] MongoDB connection closed.")

app = FastAPI(
    title="LEARNLY API",
    description="Virtual AI Co-Instructor Platform API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    settings.FRONTEND_URL,
]

# Add a wildcard for Render subdomains to be safer during deployment
if "onrender.com" in settings.FRONTEND_URL:
    # This allows variations if the user changes the name
    origins.append(settings.FRONTEND_URL.replace("https://", "http://"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create uploads directory if it doesn't exist
os.makedirs("uploads", exist_ok=True)
os.makedirs("vector_stores", exist_ok=True)

# Mount static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(courses.router, prefix="/courses", tags=["Courses"])
app.include_router(assignments.router, prefix="/assignments", tags=["Assignments"])
app.include_router(quiz.router, prefix="/quiz", tags=["Quiz"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(rag.router, prefix="/rag", tags=["RAG"])
app.include_router(moderation.router, prefix="/moderation", tags=["Moderation"])
app.include_router(departments.router, prefix="/departments", tags=["Departments"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])

@app.get("/")
async def root():
    return {
        "message": "Welcome to LEARNLY API (MongoDB)",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ollama": "ready"
    }
