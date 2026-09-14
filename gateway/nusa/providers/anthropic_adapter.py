"""Anthropic Claude LLM Provider Adapter."""

import json
import uuid
from typing import Any, AsyncGenerator
import httpx
from nusa.providers.base import BaseProvider, LLMResponse, ToolCallRequest


class AnthropicProvider(BaseProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.anthropic.com/v1",
        default_model: str = "claude-3-5-sonnet-20241022",
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.default_model = default_model

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> LLMResponse:
        url = f"{self.base_url}/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        # Format system prompt and messages for Anthropic
        system_prompt = ""
        formatted_messages = []
        for m in messages:
            if m.get("role") == "system":
                system_prompt += m.get("content", "") + "\n"
            else:
                formatted_messages.append({
                    "role": m.get("role", "user"),
                    "content": m.get("content", ""),
                })

        # Format tools for Anthropic
        anthropic_tools = []
        if tools:
            for t in tools:
                fn = t.get("function", {})
                anthropic_tools.append({
                    "name": fn.get("name"),
                    "description": fn.get("description", ""),
                    "input_schema": fn.get("parameters", {}),
                })

        payload: dict[str, Any] = {
            "model": model or self.default_model,
            "max_tokens": 4096,
            "messages": formatted_messages,
        }
        if system_prompt:
            payload["system"] = system_prompt.strip()
        if anthropic_tools:
            payload["tools"] = anthropic_tools

        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        content_blocks = data.get("content", [])
        text_content = ""
        parsed_tool_calls: list[ToolCallRequest] = []

        for block in content_blocks:
            if block.get("type") == "text":
                text_content += block.get("text", "")
            elif block.get("type") == "tool_use":
                parsed_tool_calls.append(
                    ToolCallRequest(
                        id=block.get("id", str(uuid.uuid4())),
                        name=block.get("name", ""),
                        arguments=block.get("input", {}),
                    )
                )

        stop_reason = data.get("stop_reason", "end_turn")
        finish_reason = "tool_calls" if stop_reason == "tool_use" else "stop"

        return LLMResponse(
            content=text_content,
            tool_calls=parsed_tool_calls,
            finish_reason=finish_reason,
        )

    async def stream_chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        # Simple fallback to non-streaming for Anthropic adapter
        res = await self.chat_completion(messages, tools, model)
        if res.content:
            yield res.content
