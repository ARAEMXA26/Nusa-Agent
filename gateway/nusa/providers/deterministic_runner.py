"""Deterministic Agent Planner and Tool Runner for automated verification and offline operation."""

import uuid
from typing import Any, AsyncGenerator
from nusa.providers.base import BaseProvider, LLMResponse, ToolCallRequest


class DeterministicRunnerProvider(BaseProvider):
    """Deterministic agent provider that produces planned steps to solve tasks.
    
    This exercises real tool execution (file_read, file_patch, run_test),
    approval gates, and artifact production reliably.
    """

    def __init__(self, plan_type: str = "coding_fix"):
        self.plan_type = plan_type
        self.step = 0

    async def chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> LLMResponse:
        self.step += 1

        # Check last message to see what happened
        last_msg = messages[-1] if messages else {}
        last_content = last_msg.get("content", "")

        # Step 1: Read workspace file to understand current state
        if self.step == 1:
            return LLMResponse(
                content="Langkah 1: Saya akan memeriksa isi file sumber untuk menganalisis masalah dan menyusun rencana perbaikan.",
                tool_calls=[
                    ToolCallRequest(
                        id=str(uuid.uuid4()),
                        name="file_read",
                        arguments={"path": "main.py"},
                    )
                ],
                finish_reason="tool_calls",
            )

        # Step 2: Propose patch to fix the bug (requires human approval)
        elif self.step == 2:
            return LLMResponse(
                content="Langkah 2: Telah ditemukan bug pada fungsi. Saya akan menerapkan patch untuk memperbaiki logika.",
                tool_calls=[
                    ToolCallRequest(
                        id=str(uuid.uuid4()),
                        name="file_patch",
                        arguments={
                            "path": "main.py",
                            "search_content": "def calculate(a, b):\n    return a - b",
                            "replace_content": "def calculate(a, b):\n    return a + b",
                        },
                    )
                ],
                finish_reason="tool_calls",
            )

        # Step 3: Run real verification test
        elif self.step == 3:
            return LLMResponse(
                content="Langkah 3: Patch telah diterapkan. Sekarang saya akan menjalankan test suite verifikasi untuk memastikan bug teratasi.",
                tool_calls=[
                    ToolCallRequest(
                        id=str(uuid.uuid4()),
                        name="run_test",
                        arguments={"command": "python3 test_main.py"},
                    )
                ],
                finish_reason="tool_calls",
            )

        # Step 4: Final verification and task completion
        else:
            return LLMResponse(
                content="Langkah 4: Semua pengujian verifikasi telah lulus. Patch kode terverifikasi bekerja dengan benar dan tugas telah selesai.",
                tool_calls=[],
                finish_reason="stop",
            )

    async def stream_chat_completion(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]] | None = None,
        model: str | None = None,
    ) -> AsyncGenerator[str, None]:
        res = await self.chat_completion(messages, tools, model)
        yield res.content
