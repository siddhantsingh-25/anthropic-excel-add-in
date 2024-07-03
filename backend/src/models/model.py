import pydantic
from typing import Literal, List, Dict, Optional

class Message(pydantic.BaseModel):
    content: str
    role: str = "user"

class ChatRequest(pydantic.BaseModel):
    messages: list[Message]
    stream: bool = True

class ClaudeMessage(pydantic.BaseModel):
    role: str = "user"
    content: List[Dict]

class OcrRequest(pydantic.BaseModel):
    imageUrl: str
    imageType: Literal["image/jpeg", "image/png", "image/gif", "image/webp"] = "image/jpeg"
    productKey: str = None
    
class ApiResponse(pydantic.BaseModel):
    messages: list[ClaudeMessage]
    text: str

class RetryRequest(pydantic.BaseModel):
    messages: list[ClaudeMessage]
    retryMessage: str    
    
class UserData(pydantic.BaseModel):
    user_id: str