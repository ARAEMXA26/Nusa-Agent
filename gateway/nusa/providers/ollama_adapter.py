"""Ollama Local LLM Provider Adapter."""

import json
import uuid
from typing import Any, AsyncGenerator
import httpx
from nusa.providers.base import BaseProvider, LLMResponse, ToolCallRequest


class OllamaProvider(BaseProvider):
    def __init__(
        self,
        base_url: str = "http://127.0.0.1:11434",
        default_model: str = "llama3.1",
    ):
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> LLMResponse:
        url = f"{self.base_url}/api/chat"
        payload: dict[str, Any] = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": False,
        }
        if tools:
            # Ollama accepts OpenAI format tools
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()

        message = data.get("message", {})
        content = message.get("content") or ""
        tool_calls_raw = message.get("tool_calls", [])

        parsed_tool_calls: list[ToolCallRequest] = []
        for tc in tool_calls_raw:
            fn = tc.get("function", {})
            parsed_tool_calls.append(
                ToolCallRequest(
                    id=str(uuid.uuid4()),
                    name=fn.get("name", ""),
                    arguments=fn.get("arguments", {}),
                )
            )

        finish_reason = "tool_calls" if parsed_tool_calls else "stop"
        return LLMResponse(
            content=content,
            tool_calls=parsed_tool_calls,
            finish_reason=finish_reason,
        )

    async def stream_chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model or self.default_model,
            "messages": messages,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        chunk = json.loads(line)
                        msg = chunk.get("message", {})
                        text = msg.get("content", "")
                        if text:
                            yield text
                    except Exception:
                        continue
