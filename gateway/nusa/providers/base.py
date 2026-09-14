"""Base interfaces for LLM providers."""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator
from pydantic import BaseModel


class ToolCallRequest(BaseModel):
    id: str
    name: str
    arguments: dict[str, Any]


class LLMResponse(BaseModel):
    content: str
    tool_calls: list[ToolCallRequest] = []
    finish_reason: str = "stop"  # stop, tool_calls, length


class BaseProvider(ABC):
    @abstractmethod
    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> LLMResponse:
        """Send chat messages and tool definitions to the provider."""
        pass

    @abstractmethod
    def stream_chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """Stream response tokens."""
        pass
