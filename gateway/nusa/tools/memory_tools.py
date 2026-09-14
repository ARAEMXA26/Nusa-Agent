"""Memory manipulation tools for Agent self-reflection and context persistence."""

from typing import Any, Dict
from nusa.memory.store import memory_store


async def tool_memory_search(workspace_root: str, query: str, limit: int = 5) -> Dict[str, Any]:
    """Search for relevant persistent memories and preferences."""
    results = memory_store.search_memories(query=query, limit=limit)
    return {
        "success": True,
        "query": query,
        "count": len(results),
        "results": [
            {
                "key": r["key"],
                "value": r["value"],
                "scope": r.get("scope", "unknown"),
                "confidence": r.get("confidence", 1.0),
            }
            for r in results
        ],
    }


async def tool_memory_store(
    workspace_root: str,
    key: str,
    value: str,
    scope: str = "project",
) -> Dict[str, Any]:
    """Store or update a key piece of information or preference in memory."""
    res = memory_store.store_memory(
        key=key,
        value=value,
        scope=scope,
        workspace_root=workspace_root,
    )
    return {
        "success": True,
        "message": f"Memory '{key}' successfully saved under scope '{scope}'.",
        "memory": res,
    }


async def tool_memory_forget(
    workspace_root: str,
    key: str,
    scope: str = "project",
) -> Dict[str, Any]:
    """Forget or remove an obsolete memory item."""
    deleted = memory_store.delete_memory(key=key, workspace_root=workspace_root)
    return {
        "success": deleted,
        "message": f"Memory '{key}' was {'removed' if deleted else 'not found'}.",
    }


async def tool_memory_list(
    workspace_root: str,
    scope: str | None = None,
) -> Dict[str, Any]:
    """List stored memories."""
    items = memory_store.list_memories(scope=scope)
    return {
        "success": True,
        "count": len(items),
        "memories": [
            {
                "key": i["key"],
                "value": i["value"],
                "scope": i.get("scope", "unknown"),
                "created_at": i.get("created_at"),
            }
            for i in items
        ],
    }
