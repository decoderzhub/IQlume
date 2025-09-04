#!/usr/bin/env python3
from dotenv import load_dotenv
import uvicorn

# Load environment variables from .env file
load_dotenv()

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=6853,
        reload=True,
        log_level="info"
    )