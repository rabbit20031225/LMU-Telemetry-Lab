import os
import sys
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

def get_log_file():
    # Use AppData/Local for logs to avoid permission issues in Program Files
    if getattr(sys, 'frozen', False):
        log_dir = os.path.join(os.environ.get('LOCALAPPDATA', os.path.expanduser("~")), "LMU_Telemetry_Lab")
        os.makedirs(log_dir, exist_ok=True)
        return os.path.join(log_dir, "backend_debug.log")
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend_debug.log")

log_file = get_log_file()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("backend_main")
logger.info("=== Application Starting ===")
logger.info(f"Executable: {sys.executable}")
logger.info(f"Log File: {log_file}")

app = FastAPI(title="LMU Telemetry Lab API")


from app.api.endpoints import router as api_router
from app.services.profiles_service import ProfilesService

# Configure CORS
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure persistent data directory exists BEFORE mounting
PROFILE_DATA_DIR = ProfilesService.get_app_data_dir()
os.makedirs(PROFILE_DATA_DIR, exist_ok=True)

app.include_router(api_router, prefix="/api/v1")

# Mount profile data directory for avatars and other user-specific assets
app.mount("/api/v1/profile-data", StaticFiles(directory=PROFILE_DATA_DIR), name="profile_data")

# --- Frontend Static Files Integration ---

def get_base_path():
    # PyInstaller creates a temp folder and stores path in _MEIPASS
    if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
        return sys._MEIPASS
    return os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

BASE_DIR = get_base_path()
DIST_DIR = os.path.join(BASE_DIR, "frontend", "dist")

from fastapi.responses import FileResponse, JSONResponse

if os.path.exists(DIST_DIR):
    logger.info(f"[*] Found frontend/dist at {DIST_DIR}, mounting to /")
    
    # Explicitly serve the root index.html
    @app.get("/")
    async def serve_index():
        return FileResponse(os.path.join(DIST_DIR, "index.html"))

    # Mount the rest of the static files
    app.mount("/", StaticFiles(directory=DIST_DIR, html=False), name="frontend")
    
    # SPA Fallback for client-side routing
    @app.exception_handler(404)
    async def custom_404_handler(request, __):
        if request.url.path.startswith("/api/"):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        
        index_path = os.path.join(DIST_DIR, "index.html")
        if os.path.exists(index_path):
            return FileResponse(index_path)
        return JSONResponse({"detail": "Not Found", "debug_path": index_path}, status_code=404)
else:
    logger.error(f"[*] ERROR: Frontend dist directory NOT found at {DIST_DIR}")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "antigravity-backend", "version": "1.3.2"}

if __name__ == "__main__":
    import uvicorn
    import multiprocessing
    
    logger.info(f"Sys Args: {sys.argv}")
    
    # CRITICAL: Prevent infinite process spawning in PyInstaller
    multiprocessing.freeze_support()
    
    is_frozen = getattr(sys, 'frozen', False)
    
    logger.info("Starting uvicorn server on 127.0.0.1:8000...")
    
    # Custom log config to force uvicorn to use our file handler
    log_config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            },
        },
        "handlers": {
            "file": {
                "class": "logging.FileHandler",
                "filename": log_file,
                "formatter": "default",
            },
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "default",
            },
        },
        "loggers": {
            "uvicorn": {"handlers": ["file", "console"], "level": "INFO"},
            "uvicorn.error": {"handlers": ["file", "console"], "level": "INFO"},
            "uvicorn.access": {"handlers": ["file", "console"], "level": "INFO"},
        },
    }

    try:
        uvicorn.run(
            app, 
            host="127.0.0.1", 
            port=8000, 
            log_config=log_config,
            reload=not is_frozen  # ONLY reload in development
        )
        logger.info("Uvicorn server exited cleanly.")
    except Exception as e:
        logger.error(f"Uvicorn server crashed: {e}", exc_info=True)
