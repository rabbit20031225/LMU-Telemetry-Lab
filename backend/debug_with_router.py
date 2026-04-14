from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import router as api_router
import os
import sys

app = FastAPI(title="LMU Telemetry Lab API - Debug Router")

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

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "antigravity-backend-debug-router"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("debug_with_router:app", host="0.0.0.0", port=8002, reload=True)
