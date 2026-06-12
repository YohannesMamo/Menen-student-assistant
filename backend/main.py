import warnings
warnings.filterwarnings("ignore", message="Valid config keys have changed in V2")
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from core.config import settings   # <-- Import the global settings
import os
import socketio

# Import models and routes
import models
from routes import auth, quiz, student, textbooks, study, exams, quizzes, questions, profile, dashboard, students, chat, highlights

# Initialize app
app = FastAPI(title="Menen Student Assistant API", version="1.0.0")

# ==================== STATIC FILES MOUNTING ====================

# Get the path to the Textbooks folder (relative to this file)
current_dir = Path(__file__).parent
textbooks_path = current_dir / "Textbooks"

# Mount Textbooks folder (try both uppercase and lowercase paths)
if textbooks_path.exists():
    textbooks_dir = Path(__file__).parent / settings.TEXTBOOKS_PATH
    print(f"Serving PDFs from: {textbooks_dir}")
    app.mount("/Textbooks", StaticFiles(directory=str(textbooks_dir)), name="textbooks")
else:
    print(f"❌ Textbooks folder not found at: {textbooks_path}")
    
    # Alternative path one level up (if running from different directory)
    alt_path = current_dir.parent / "Textbooks"
    if alt_path.exists():
        app.mount("/Textbooks", StaticFiles(directory=str(alt_path)), name="textbooks_upper")
        app.mount("/textbooks", StaticFiles(directory=str(alt_path)), name="textbooks_lower")
        print(f"✅ Serving PDFs from: {alt_path}")
    else:
        print(f"⚠️ Could not find Textbooks folder. PDF serving will not work.")

# Mount uploads folder for user files
uploads_path = current_dir / "uploads"
os.makedirs(uploads_path, exist_ok=True)
os.makedirs(uploads_path / "chat_files", exist_ok=True)
app.mount("/files", StaticFiles(directory=str(uploads_path)), name="uploads")
print(f"✅ Mounted uploads directory at /files (path: {uploads_path})")

# ==================== SOCKET.IO SETUP ====================

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*'
)
socket_app = socketio.ASGIApp(sio, app)

# Initialize socket.io handlers
chat.init_socketio(sio)

# ==================== CORS MIDDLEWARE ====================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==================== ROUTERS ====================

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(student.router, prefix="/api/student", tags=["Student"])
app.include_router(textbooks.router, tags=["Textbooks"])
app.include_router(study.router, tags=["Study"])
app.include_router(exams.router, tags=["Exams"])
app.include_router(quizzes.router, tags=["Quizzes"])
app.include_router(questions.router, tags=["Questions"])
app.include_router(profile.router, tags=["Profile"])
app.include_router(dashboard.router, tags=["Dashboard"])
app.include_router(students.router, prefix="/api/students", tags=["Students"])
app.include_router(chat.router, tags=["Chat"])
app.include_router(highlights.router, tags=["Highlights"])

# ==================== ROOT ENDPOINT ====================

@app.get("/")
async def root():
    return {"message": "Menen Student Assistant API"}