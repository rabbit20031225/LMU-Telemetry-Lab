from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os
import sys

app = FastAPI(title="LMU Telemetry Lab API - Debug")

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

# Skip router and static files for now to test minimal startup
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "antigravity-backend-debug"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("debug_no_mount:app", host="0.0.0.0", port=8002, reload=True)
