from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPAuthorizationCredentials
from typing import List, Dict, Any
import logging
import anthropic
from dependencies import (
    get_current_user,
    get_anthropic_client,
    security
)

router = APIRouter(prefix="/api/chat", tags=["chat"])
logger = logging.getLogger(__name__)

@router.post("/anthropic")
async def chat_with_anthropic(
    request_data: Dict[str, Any],
    credentials: HTTPAuthorizationCredentials = Depends(security),
    current_user = Depends(get_current_user),
    anthropic_client: anthropic.Anthropic = Depends(get_anthropic_client)
):
    """Chat with Anthropic Claude"""
    try:
        message = request_data.get("message")
        history = request_data.get("history", [])
        model = request_data.get("model", "claude-3-5-sonnet-20241022")
        
        if not message:
            raise HTTPException(status_code=400, detail="Message is required")
        
        # Build conversation history
        messages = []
        
        # Add conversation history
        for msg in history[-10:]:  # Limit to last 10 messages
            if msg.get("role") in ["user", "assistant"]:
                messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })
        
        # Add current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        # System prompt for trading assistant
        system_prompt = """You are BrokerNomics AI, an expert trading strategy assistant for the brokernomex platform. You help users understand different trading strategies, analyze market conditions, and guide them through creating automated trading bots.

Key areas of expertise:
- Options strategies (covered calls, iron condors, straddles, the wheel)
- Grid trading bots (spot grid, futures grid, infinity grid)
- DCA (Dollar Cost Averaging) strategies
- Smart rebalancing and portfolio management
- Risk management and position sizing
- Market analysis and technical indicators

Always provide practical, actionable advice while emphasizing risk management. When discussing strategies, explain both the potential benefits and risks. Be helpful but remind users to do their own research and consider their risk tolerance."""
        
        # Make API call to Anthropic
        response = anthropic_client.messages.create(
            model=model,
            max_tokens=4000,
            temperature=0.7,
            system=system_prompt,
            messages=messages
        )
        
        # Extract response content
        response_content = ""
        if response.content and len(response.content) > 0:
            response_content = response.content[0].text
        
        # Calculate token usage
        usage = {
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "total_tokens": response.usage.input_tokens + response.usage.output_tokens
        }
        
        return {
            "message": response_content,
            "model": response.model,
            "usage": usage
        }
        
    except anthropic.APIError as e:
        logger.error(f"Anthropic API error: {e}")
        raise HTTPException(status_code=500, detail=f"Anthropic API error: {str(e)}")
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process chat request: {str(e)}")