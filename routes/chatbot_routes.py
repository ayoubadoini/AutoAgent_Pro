"""Route FastAPI pour le chatbot IA connecté à Cohere."""
from __future__ import annotations

from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel.ext.asyncio.session import AsyncSession

from database.postgres import get_session
from services.chatbot_service import generate_reply
from services.voiture_service import get_voitures


class ChatbotRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class ChatbotResponse(BaseModel):
    answer: str


router = APIRouter(tags=["chatbot"])


@router.post("/ask", response_model=ChatbotResponse)
async def ask_chatbot(
    payload: ChatbotRequest,
    session: AsyncSession = Depends(get_session),
):
    message = payload.message.strip()
    if not message:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le message du chatbot ne peut pas être vide.",
        )

    cars = await get_voitures(session)
    answer = await generate_reply(message, cars)
    return ChatbotResponse(answer=answer)