"""Agent Orchestrator managing task execution loop, tool dispatch, and approvals."""

import asyncio
import json
import time
import uuid
from typing import Any
from nusa.config import config
from nusa.db.connection import get_db
from nusa.core.state_machine import TaskStateMachine, TaskState
from nusa.core.events import event_bus
from nusa.security.policy_engine import PolicyEngine, PolicyDecision
from nusa.security.audit import log_audit_event
from nusa.tools.registry import tool_registry
from nusa.artifacts.manager import artifact_manager
from nusa.skills.manager import skill_manager
from nusa.providers.factory import get_provider


class TaskOrchestrator:
    def __init__(self):
        self._running_tasks: dict[str, asyncio.Task] = {}
        self._state_machines: dict[str, TaskStateMachine] = {}
        self._pending_approvals: dict[str, asyncio.Future[str]] = {}
        self._steering_queues: dict[str, list[str]] = {}

    def get_state(self, task_id: str) -> TaskState:
        if task_id in self._state_machines:
            return self._state_machines[task_id].state
        with get_db() as db:
            row = db.execute("SELECT status FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if row:
                return TaskState(row["status"])
        return TaskState.QUEUED

    def _set_state(self, task_id: str, new_state: TaskState) -> None:
        sm = self._state_machines.get(task_id)
        if not sm:
            sm = TaskStateMachine()
            self._state_machines[task_id] = sm
        
        old_state = sm.state
        if old_state != new_state:
            sm.transition(new_state)
            with get_db() as db:
                db.execute(
                    "UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    (new_state.value, task_id),
                )
            asyncio.create_task(
                event_bus.emit(
                    "task.state_changed",
                    task_id=task_id,
                    payload={"old_state": old_state.value, "new_state": new_state.value},
                )
            )

    async def start_task(self, task_id: str) -> None:
        if task_id in self._running_tasks and not self._running_tasks[task_id].done():
            return

        task_coro = asyncio.create_task(self._run_loop(task_id))
        self._running_tasks[task_id] = task_coro

    async def steer_task(self, task_id: str, message: str) -> None:
        """Inject mid-turn steering message into the active task context."""
        if task_id not in self._steering_queues:
            self._steering_queues[task_id] = []
        self._steering_queues[task_id].append(message)

        # Record in messages
        msg_id = str(uuid.uuid4())
        with get_db() as db:
            db.execute(
                "INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, 'user', ?)",
                (msg_id, task_id, f"[MID-TURN STEERING]: {message}"),
            )
        await event_bus.emit(
            "message.delta",
            task_id=task_id,
            payload={"role": "user", "content": f"[User Steering]: {message}"},
        )

    def resolve_approval(self, approval_id: str, decision: str) -> bool:
        """Resolve a pending human approval with 'approved' or 'rejected'."""
        with get_db() as db:
            appr = db.execute("SELECT * FROM approvals WHERE id = ?", (approval_id,)).fetchone()
            if not appr:
                return False
            db.execute(
                "UPDATE approvals SET status = ?, decided_at = CURRENT_TIMESTAMP WHERE id = ?",
                (decision, approval_id),
            )

        future = self._pending_approvals.get(approval_id)
        if future and not future.done():
            future.set_result(decision)
            return True
        return False

    async def cancel_task(self, task_id: str, reason: str = "User cancelled") -> None:
        task_coro = self._running_tasks.get(task_id)
        if task_coro and not task_coro.done():
            task_coro.cancel()

        current_state = self.get_state(task_id)
        if current_state in (TaskState.COMPLETED, TaskState.FAILED, TaskState.CANCELLED):
            return

        self._set_state(task_id, TaskState.CANCELLED)
        log_audit_event(
            actor="user",
            event_type="task_cancelled",
            task_id=task_id,
            details={"reason": reason},
        )
        await event_bus.emit(
            "task.failed",
            task_id=task_id,
            payload={"reason": reason, "status": "cancelled"},
        )

    async def _run_loop(self, task_id: str) -> None:
        # Load task and project
        with get_db() as db:
            task_row = db.execute("SELECT * FROM tasks WHERE id = ?", (task_id,)).fetchone()
            if not task_row:
                return
            project_row = db.execute(
                "SELECT * FROM projects WHERE id = ?", (task_row["project_id"],)
            ).fetchone()
            if not project_row:
                return

        workspace_root = project_row["root_path"]
        goal = task_row["goal"]
        default_model = project_row["default_model"] or config.default_model

        policy_engine = PolicyEngine(workspace_root)
        provider = get_provider(default_model)

        self._state_machines[task_id] = TaskStateMachine(TaskState.QUEUED)
        self._set_state(task_id, TaskState.PLANNING)

        log_audit_event(
            actor="agent",
            event_type="task_started",
            project_id=project_row["id"],
            task_id=task_id,
            details={"goal": goal, "workspace": workspace_root},
        )

        system_prompt = (
            "You are Nusa Agent, a reliable, security-conscious desktop AI agent. "
            "You have access to tools to inspect and modify files, run tests, and execute commands in the workspace. "
            "Always formulate a clear plan, read files before modifying them, and verify your changes with tests."
        )

        skills_summary = skill_manager.get_progressive_summary(workspace_root)
        if skills_summary:
            skills_text = "\n".join(
                f"- {s['name']} (${s['id']}): {s['description']} (allowed tools: {', '.join(s['tools'])})"
                for s in skills_summary
            )
            system_prompt += (
                f"\n\nAvailable Skills (Progressive Catalog):\n{skills_text}\n"
                "To activate any skill and receive full detailed instructions, invoke tool 'skill_activate' with {'skill_name': '<id>'}.\n"
                "To search external MCP tools on demand, invoke tool 'tool_search_mcp' with {'query': '<capability>'}.\n"
            )

        messages: list[dict[str, Any]] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Goal: {goal}"},
        ]

        # Automatic and explicit skill routing
        routed_skills = skill_manager.route_skills(goal, workspace_root)
        for r_skill in routed_skills:
            instructions = skill_manager.activate_skill(
                r_skill.id,
                task_id=task_id,
                reason="Router match on goal intent or explicit $skill mention",
                model=default_model,
            )
            if instructions:
                messages.append({
                    "role": "system",
                    "content": instructions,
                })
                await event_bus.emit(
                    "skill.activated",
                    task_id=task_id,
                    payload={
                        "skill_id": r_skill.id,
                        "skill_name": r_skill.name,
                        "version": r_skill.version,
                    },
                )

        # Record initial goal message in DB
        with get_db() as db:
            db.execute(
                "INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, 'user', ?)",
                (str(uuid.uuid4()), task_id, goal),
            )

        tools_schema = tool_registry.get_openai_tools()
        iterations = 0

        try:
            while iterations < config.max_tool_iterations:
                iterations += 1

                # Check steering queue
                if task_id in self._steering_queues and self._steering_queues[task_id]:
                    while self._steering_queues[task_id]:
                        steering_msg = self._steering_queues[task_id].pop(0)
                        messages.append({
                            "role": "user",
                            "content": f"[MID-TURN STEERING FROM USER]: {steering_msg}",
                        })

                # Call model / planner
                response = await provider.chat_completion(
                    messages=messages,
                    tools=tools_schema,
                    model=default_model,
                )

                if response.content:
                    msg_id = str(uuid.uuid4())
                    with get_db() as db:
                        db.execute(
                            "INSERT INTO messages (id, task_id, role, content) VALUES (?, ?, 'assistant', ?)",
                            (msg_id, task_id, response.content),
                        )
                    await event_bus.emit(
                        "message.delta",
                        task_id=task_id,
                        payload={"role": "assistant", "content": response.content},
                    )
                    messages.append({"role": "assistant", "content": response.content})

                # If no tool calls, task is finished
                if not response.tool_calls:
                    self._set_state(task_id, TaskState.COMPLETED)
                    await event_bus.emit(
                        "task.completed",
                        task_id=task_id,
                        payload={"summary": response.content},
                    )
                    break

                # Execute tool calls
                self._set_state(task_id, TaskState.EXECUTING)
                for tc in response.tool_calls:
                    tool_call_id = str(uuid.uuid4())
                    tc_name = tc.name
                    tc_args = tc.arguments

                    # Evaluate policy under active skill least-privilege boundary
                    active_skill = skill_manager.get_active_skill_for_task(task_id)
                    policy_eval = policy_engine.evaluate(tc_name, tc_args, active_skill=active_skill)

                    # 1. DENY
                    if policy_eval.decision == PolicyDecision.DENY:
                        err_msg = f"Security Policy Violation (DENY): {policy_eval.reason}"
                        skill_manager.record_tool_call(
                            task_id=task_id,
                            tool_name=tc_name,
                            decision="deny",
                            permitted=False,
                            arguments=tc_args,
                            result={"error": err_msg},
                            duration_ms=0,
                        )
                        with get_db() as db:
                            db.execute(
                                """
                                INSERT INTO tool_calls (id, task_id, tool_name, arguments_json, result_json, status)
                                VALUES (?, ?, ?, ?, ?, 'failed')
                                """,
                                (tool_call_id, task_id, tc_name, json.dumps(tc_args), json.dumps({"error": err_msg})),
                            )
                        messages.append({
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": json.dumps({"error": err_msg}),
                        })
                        continue

                    # 2. ASK (Human Approval)
                    if policy_eval.decision == PolicyDecision.ASK:
                        approval_id = str(uuid.uuid4())
                        with get_db() as db:
                            db.execute(
                                """
                                INSERT INTO tool_calls (id, task_id, tool_name, arguments_json, status)
                                VALUES (?, ?, ?, ?, 'approval_required')
                                """,
                                (tool_call_id, task_id, tc_name, json.dumps(tc_args)),
                            )
                            db.execute(
                                """
                                INSERT INTO approvals (id, task_id, tool_call_id, action_type, description, payload_preview, status)
                                VALUES (?, ?, ?, ?, ?, ?, 'pending')
                                """,
                                (
                                    approval_id,
                                    task_id,
                                    tool_call_id,
                                    policy_eval.action_type,
                                    policy_eval.reason,
                                    policy_eval.preview,
                                    ),
                            )

                        self._set_state(task_id, TaskState.AWAITING_APPROVAL)
                        await event_bus.emit(
                            "tool.approval_required",
                            task_id=task_id,
                            payload={
                                "approval_id": approval_id,
                                "tool_name": tc_name,
                                "action_type": policy_eval.action_type,
                                "description": policy_eval.reason,
                                "preview": policy_eval.preview,
                            },
                        )

                        # Await human response
                        future: asyncio.Future[str] = asyncio.get_running_loop().create_future()
                        self._pending_approvals[approval_id] = future
                        decision = await future
                        self._pending_approvals.pop(approval_id, None)

                        if decision != "approved":
                            # Rejected by user
                            self._set_state(task_id, TaskState.EXECUTING)
                            rejection_msg = "Action was rejected by the user."
                            skill_manager.record_approval(
                                task_id=task_id,
                                tool_name=tc_name,
                                action_type=policy_eval.action_type,
                                reason=policy_eval.reason,
                                status="rejected",
                            )
                            skill_manager.record_tool_call(
                                task_id=task_id,
                                tool_name=tc_name,
                                decision="ask_rejected",
                                permitted=False,
                                arguments=tc_args,
                                result={"error": rejection_msg},
                                duration_ms=0,
                            )
                            with get_db() as db:
                                db.execute(
                                    "UPDATE tool_calls SET status = 'rejected', result_json = ? WHERE id = ?",
                                    (json.dumps({"error": rejection_msg}), tool_call_id),
                                )
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "content": json.dumps({"rejected": True, "message": rejection_msg}),
                            })
                            continue

                        # Approved! Resume execution
                        self._set_state(task_id, TaskState.EXECUTING)
                        skill_manager.record_approval(
                            task_id=task_id,
                            tool_name=tc_name,
                            action_type=policy_eval.action_type,
                            reason=policy_eval.reason,
                            status="approved",
                        )

                    # 3. ALLOW or Approved ASK -> Run real tool!
                    start_t = time.time()
                    await event_bus.emit(
                        "tool.call_started",
                        task_id=task_id,
                        payload={"tool_name": tc_name, "arguments": tc_args},
                    )

                    tool_res = await tool_registry.execute_tool(
                        workspace_root, tc_name, tc_args, task_id=task_id
                    )
                    duration_ms = int((time.time() - start_t) * 1000)

                    skill_manager.record_tool_call(
                        task_id=task_id,
                        tool_name=tc_name,
                        decision="allow" if policy_eval.decision == PolicyDecision.ALLOW else "ask_approved",
                        permitted=True,
                        arguments=tc_args,
                        result=tool_res,
                        duration_ms=duration_ms,
                    )

                    # Update tool call record
                    with get_db() as db:
                        db.execute(
                            """
                            INSERT OR REPLACE INTO tool_calls (id, task_id, tool_name, arguments_json, result_json, status, duration_ms, completed_at)
                            VALUES (?, ?, ?, ?, ?, 'succeeded', ?, CURRENT_TIMESTAMP)
                            """,
                            (tool_call_id, task_id, tc_name, json.dumps(tc_args), json.dumps(tool_res), duration_ms),
                        )

                    await event_bus.emit(
                        "tool.call_completed",
                        task_id=task_id,
                        payload={"tool_name": tc_name, "result": tool_res, "duration_ms": duration_ms},
                    )

                    # If file patch produced a diff, record artifact
                    if tc_name in ("file_patch", "file_write") and tool_res.get("diff"):
                        diff_content = tool_res["diff"]
                        diff_artifact = artifact_manager.create_artifact(
                            task_id=task_id,
                            title=f"Diff: {tc_args.get('path', '')}",
                            type="diff",
                            content=diff_content,
                            source_path=tc_args.get("path"),
                            verification_status="unverified",
                        )
                        await event_bus.emit(
                            "artifact.created",
                            task_id=task_id,
                            payload=diff_artifact.model_dump(),
                        )

                    # If run_test was executed, record verification test artifact
                    if tc_name == "run_test":
                        self._set_state(task_id, TaskState.VERIFYING)
                        passed = tool_res.get("passed", False)
                        status_str = "verified" if passed else "failed"
                        test_artifact = artifact_manager.create_artifact(
                            task_id=task_id,
                            title=f"Test Report: {tc_args.get('command')}",
                            type="test_report",
                            content=f"Passed: {passed}\nSummary: {tool_res.get('summary')}\n\nSTDOUT:\n{tool_res.get('stdout')}\n\nSTDERR:\n{tool_res.get('stderr')}",
                            verification_status=status_str,
                        )
                        await event_bus.emit(
                            "artifact.created",
                            task_id=task_id,
                            payload=test_artifact.model_dump(),
                        )
                        self._set_state(task_id, TaskState.EXECUTING)

                    # Feed tool result back to model
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(tool_res),
                    })

            # Check if iterations reached limit
            if iterations >= config.max_tool_iterations:
                self._set_state(task_id, TaskState.FAILED)
                await event_bus.emit(
                    "task.failed",
                    task_id=task_id,
                    payload={"reason": f"Maximum tool iteration limit ({config.max_tool_iterations}) reached."},
                )

        except asyncio.CancelledError:
            self._set_state(task_id, TaskState.CANCELLED)
        except Exception as e:
            self._set_state(task_id, TaskState.FAILED)
            await event_bus.emit(
                "task.failed",
                task_id=task_id,
                payload={"reason": f"Execution error: {str(e)}"},
            )
        finally:
            self._running_tasks.pop(task_id, None)
            skill_manager.deactivate_skill(task_id)


orchestrator = TaskOrchestrator()
