#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/gateway"

if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    export PATH="/Users/ariardianto/.hermes/bin:$PATH"
    uv venv
    source .venv/bin/activate
    uv pip install fastapi "uvicorn[standard]" pydantic websockets httpx python-multipart pytest pytest-asyncio hatchling
else
    source .venv/bin/activate
fi

echo "Starting Nusa Agent Gateway on http://127.0.0.1:4141..."
exec uvicorn nusa.main:app --host 127.0.0.1 --port 4141 --reload
