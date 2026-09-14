"""Provider factory for instantiating LLM adapters."""

import os
from typing import Any
from nusa.providers.base import BaseProvider
from nusa.providers.openai_adapter import OpenAIProvider
from nusa.providers.anthropic_adapter import AnthropicProvider
from nusa.providers.ollama_adapter import OllamaProvider
from nusa.providers.deterministic_runner import DeterministicRunnerProvider


def get_provider(
    model_name: str | None = None,
    settings: dict[str, Any] | None = None,
) -> BaseProvider:
    settings = settings or {}
    model = model_name or "openai/gpt-4o"

    # Deterministic test runner
    if model.startswith("deterministic") or model.startswith("test"):
        return DeterministicRunnerProvider()

    # Anthropic
    if model.startswith("anthropic") or "claude" in model:
        api_key = settings.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY", "")
        if api_key:
            return AnthropicProvider(api_key=api_key, default_model=model)

    # Ollama
    if model.startswith("ollama") or "llama" in model:
        base_url = settings.get("ollama_base_url") or os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        return OllamaProvider(base_url=base_url, default_model=model.replace("ollama/", ""))

    # OpenAI / OpenRouter
    api_key = settings.get("openai_api_key") or os.getenv("OPENAI_API_KEY", "")
    base_url = settings.get("openai_base_url") or os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    if api_key:
        return OpenAIProvider(api_key=api_key, base_url=base_url, default_model=model)

    # If no external API keys are configured, fallback gracefully to deterministic runner
    # so tasks can still plan and execute safely rather than crashing
    return DeterministicRunnerProvider()
