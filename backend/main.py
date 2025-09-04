from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
import logging
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from routers import chat, trades, strategies, market_data, plaid_routes, brokerage_auth

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="brokernomex Trading API",
    description="Advanced trading automation platform API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://localhost:5173", 
        "http://127.0.0.1:5173",
        "https://127.0.0.1:5173",
        "https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--96435430.local-credentialless.webcontainer-api.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(chat.router)
app.include_router(trades.router)
app.include_router(strategies.router)
app.include_router(market_data.router)
app.include_router(plaid_routes.router)
app.include_router(brokerage_auth.router)

@app.get("/")
async def root():
    return {
        "message": "brokernomex Trading API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=6853)