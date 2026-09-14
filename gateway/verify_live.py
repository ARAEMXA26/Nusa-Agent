"""Live E2E Verification Script for Nusa Agent Gateway."""

import asyncio
import json
import tempfile
import urllib.request
import websockets
from pathlib import Path

BASE_URL = "http://127.0.0.1:4141"
WS_URL = "ws://127.0.0.1:4141/ws/events"


async def run_live_verification():
    print("=== NUSA AGENT LIVE VERIFICATION ===")

    # 1. Prepare isolated workspace on disk
    with tempfile.TemporaryDirectory() as tmpdir:
        workspace = Path(tmpdir).resolve()
        code_file = workspace / "main.py"
        test_file = workspace / "test_main.py"

        code_file.write_text(
            "def calculate(a, b):\n    return a - b\n"
        )
        test_file.write_text(
            "import sys\nfrom main import calculate\n\ndef test_add():\n    assert calculate(2, 3) == 5, 'Calculation error'\n\nif __name__ == '__main__':\n    test_add()\n    print('All tests passed.')\n"
        )
        print(f"[OK] Workspace prepared at: {workspace}")

        # 2. Register project via REST
        req = urllib.request.Request(
            f"{BASE_URL}/api/projects",
            data=json.dumps({"name": "Live Workspace Demo", "root_path": str(workspace)}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req) as resp:
            project_data = json.loads(resp.read().decode())
        project_id = project_data["id"]
        print(f"[OK] Project created: ID={project_id}")

        # 3. Connect to WebSocket stream
        async with websockets.connect(WS_URL) as ws:
            print("[OK] Connected to live WebSocket stream.")

            # 4. Create task
            task_req = urllib.request.Request(
                f"{BASE_URL}/api/tasks",
                data=json.dumps(
                    {
                        "project_id": project_id,
                        "goal": "Fix the calculate function in math_lib.py so test_math.py passes",
                    }
                ).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(task_req) as resp:
                task_data = json.loads(resp.read().decode())
            task_id = task_data["id"]
            print(f"[OK] Task dispatched: ID={task_id}")

            # 5. Listen to event stream and handle approval
            task_completed = False
            while not task_completed:
                msg = await ws.recv()
                evt = json.loads(msg)
                event_type = evt.get("event")
                payload = evt.get("payload", {})
                print(f" -> Event received: {event_type} | payload_keys={list(payload.keys())}")

                if event_type == "tool.approval_required":
                    approval_id = payload.get("approval_id")
                    print(f" [!] Approval required: ID={approval_id}, action={payload.get('action_type')}")
                    # Respond with approval via REST
                    resp_req = urllib.request.Request(
                        f"{BASE_URL}/api/approvals/{approval_id}/respond",
                        data=json.dumps({"decision": "approved"}).encode(),
                        headers={"Content-Type": "application/json"},
                    )
                    with urllib.request.urlopen(resp_req) as r:
                        print(" [✓] Approval granted via REST API.")

                elif event_type == "task.completed":
                    print("[OK] Task reached COMPLETED status!")
                    task_completed = True

                elif event_type == "task.failed":
                    print("[X] Task failed!")
                    raise RuntimeError("Task execution failed")

            # 6. Verify artifacts via REST
            art_req = urllib.request.Request(f"{BASE_URL}/api/artifacts/task/{task_id}")
            with urllib.request.urlopen(art_req) as resp:
                artifacts = json.loads(resp.read().decode())
            print(f"[OK] Retrieved {len(artifacts)} artifacts:")
            for a in artifacts:
                print(f"     - {a['type'].upper()}: {a['title']} (status={a['verification_status']})")

            # 7. Check file contents on disk
            final_code = code_file.read_text()
            print(f"[OK] Disk file content after real patch:\n{final_code.strip()}")
            assert "return a + b" in final_code, "Bug was not fixed in disk file!"
            print("[SUCCESS] All Phase 1 assertions verified on live server!")

            # 8. Phase 2 Verification: Progressive Skills Catalog & MCP
            print("\n=== VERIFYING PHASE 2 (SKILLS & MCP) ===")
            skills_req = urllib.request.Request(f"{BASE_URL}/api/skills")
            with urllib.request.urlopen(skills_req) as resp:
                skills = json.loads(resp.read().decode())
            print(f"[OK] Discovered {len(skills)} skills:")
            for s in skills:
                print(f"     - Skill: {s['name']} (v{s['version']}, safety={s['scan_result']['passed']})")

            # Check low-token summary
            sum_req = urllib.request.Request(f"{BASE_URL}/api/skills/summary")
            with urllib.request.urlopen(sum_req) as resp:
                summary = json.loads(resp.read().decode())
            print(f"[OK] Progressive summary contains {len(summary)} active skills (low-token context).")

            # Start reference MCP server and search tools
            start_mcp_req = urllib.request.Request(
                f"{BASE_URL}/api/mcp/servers/ref-local-01/start",
                data=b"{}",
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(start_mcp_req) as resp:
                start_res = json.loads(resp.read().decode())
            print(f"[OK] Started MCP Server: {start_res['server_id']}")

            # Search MCP tools
            search_req = urllib.request.Request(
                f"{BASE_URL}/api/mcp/tools/search",
                data=json.dumps({"query": "hash", "limit": 5}).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(search_req) as resp:
                tools_res = json.loads(resp.read().decode())
            print(f"[OK] MCP Deferred Search returned {len(tools_res)} matching tools:")
            for t in tools_res:
                print(f"     - Tool: {t['name']} (server: {t['server_name']})")
            assert any(t["name"] == "mcp_hash_calculator" for t in tools_res)

            print("[SUCCESS] All Phase 2 (Skills & MCP) assertions verified on live server!")

            # 9. Phase 3 Verification: Multi-Agent Workforce & DAG
            print("\n=== VERIFYING PHASE 3 (MULTI-AGENT WORKFORCE & DAG) ===")
            plan_dag_req = urllib.request.Request(
                f"{BASE_URL}/api/tasks/{task_id}/dag/plan",
                data=json.dumps({"use_worktree": False}).encode(),
                headers={"Content-Type": "application/json"},
            )
            with urllib.request.urlopen(plan_dag_req) as resp:
                plan_res = json.loads(resp.read().decode())
            print(f"[OK] Planned Workforce DAG: {len(plan_res['dag']['nodes'])} pipeline nodes created.")

            # Query DAG status
            get_dag_req = urllib.request.Request(f"{BASE_URL}/api/tasks/{task_id}/dag")
            with urllib.request.urlopen(get_dag_req) as resp:
                dag_status = json.loads(resp.read().decode())
            print(f"[OK] Retrieved DAG with {len(dag_status['nodes'])} subtasks:")
            for n in dag_status["nodes"]:
                print(f"     - [{n['role'].upper()}] {n['title']} (status={n['status']}, deps={n['dependencies']})")

            assert len(dag_status["nodes"]) == 4
            roles = [n["role"] for n in dag_status["nodes"]]
            assert "planner" in roles
            assert "coder" in roles
            assert "reviewer" in roles
            assert "verifier" in roles
            print("[SUCCESS] All Phase 3 (Workforce DAG & Subtasks) assertions verified on live server!")


if __name__ == "__main__":
    asyncio.run(run_live_verification())
