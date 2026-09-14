"""Secret redaction filter to prevent credential exfiltration."""

import re
from typing import Any

REDACTION_PATTERNS = [
    (re.compile(r"sk-[A-Za-z0-9_\-]{20,}"), "[REDACTED_API_KEY]"),
    (re.compile(r"ghp_[A-Za-z0-9]{36}"), "[REDACTED_GH_TOKEN]"),
    (re.compile(r"Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*", re.IGNORECASE), "Bearer [REDACTED_TOKEN]"),
    (re.compile(r"-----BEGIN [A-Z ]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+ PRIVATE KEY-----"), "[REDACTED_PRIVATE_KEY]"),
    (re.compile(r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"]?([A-Za-z0-9_\-]{12,})['\"]?"), r"\1: [REDACTED]"),
]


def redact_secrets(val: Any) -> Any:
    """Mask sensitive tokens, credentials, and private keys from strings, dicts, or lists."""
    if isinstance(val, str):
        redacted = val
        for pattern, replacement in REDACTION_PATTERNS:
            redacted = pattern.sub(replacement, redacted)
        return redacted
    elif isinstance(val, dict):
        return {k: redact_secrets(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [redact_secrets(item) for item in val]
    return val
