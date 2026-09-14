"""Reference stdio MCP Server for local testing and demonstration."""

import hashlib
import json
import platform
import sys
from datetime import datetime, timezone


def handle_initialize(req_id: int) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "result": {
            "protocolVersion": "2024-11-05",
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "nusa-reference-mcp", "version": "1.0.0"},
        },
    }


def handle_tools_list(req_id: int) -> dict:
    tools = [
        {
            "name": "mcp_system_info",
            "description": "Returns host platform, CPU architecture, and Python runtime version.",
            "inputSchema": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
        {
            "name": "mcp_hash_calculator",
            "description": "Calculates SHA256 or MD5 hash for a given text string.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "text": {"type": "string", "description": "The input text to hash"},
                    "algorithm": {
                        "type": "string",
                        "enum": ["sha256", "md5"],
                        "default": "sha256",
                        "description": "Hash algorithm to use",
                    },
                },
                "required": ["text"],
            },
        },
        {
            "name": "mcp_echo",
            "description": "Echoes back the provided message with UTC timestamp.",
            "inputSchema": {
                "type": "object",
                "properties": {
                    "message": {"type": "string", "description": "The message to echo"}
                },
                "required": ["message"],
            },
        },
    ]
    return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": tools}}


def handle_tools_call(req_id: int, params: dict) -> dict:
    tool_name = params.get("name")
    arguments = params.get("arguments", {})

    if tool_name == "mcp_system_info":
        info = {
            "platform": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "python_version": platform.python_version(),
        }
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": json.dumps(info, indent=2)}]},
        }

    elif tool_name == "mcp_hash_calculator":
        text = arguments.get("text", "")
        algo = arguments.get("algorithm", "sha256").lower()
        if algo == "md5":
            digest = hashlib.md5(text.encode("utf-8")).hexdigest()
        else:
            digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [{"type": "text", "text": json.dumps({"algorithm": algo, "digest": digest})}]
            },
        }

    elif tool_name == "mcp_echo":
        msg = arguments.get("message", "")
        now = datetime.now(timezone.utc).isoformat()
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": f"[{now}] Echo: {msg}"}]},
        }

    else:
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"},
        }


def main():
    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            text = line.strip()
            if not text:
                continue

            request = json.loads(text)
            req_id = request.get("id")
            method = request.get("method")
            params = request.get("params", {})

            if method == "initialize":
                response = handle_initialize(req_id)
            elif method == "tools/list":
                response = handle_tools_list(req_id)
            elif method == "tools/call":
                response = handle_tools_call(req_id, params)
            else:
                response = {
                    "jsonrpc": "2.0",
                    "id": req_id,
                    "error": {"code": -32601, "message": f"Method not found: {method}"},
                }

            sys.stdout.write(json.dumps(response) + "\n")
            sys.stdout.flush()
        except (KeyboardInterrupt, SystemExit):
            break
        except Exception as e:
            err_resp = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32603, "message": f"Internal error: {e}"},
            }
            sys.stdout.write(json.dumps(err_resp) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
