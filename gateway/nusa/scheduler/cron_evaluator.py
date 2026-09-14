"""Cron expression parser and execution timing evaluator."""

from datetime import datetime, timedelta
from typing import Optional, List


class CronEvaluator:
    """Evaluates standard 5-part cron syntax and shortcut formats."""

    SHORTCUTS = {
        "@yearly": "0 0 1 1 *",
        "@annually": "0 0 1 1 *",
        "@monthly": "0 0 1 * *",
        "@weekly": "0 0 * * 0",
        "@daily": "0 0 * * *",
        "@midnight": "0 0 * * *",
        "@hourly": "0 * * * *",
    }

    @classmethod
    def normalize_expr(cls, expr: str) -> str:
        expr = expr.strip().lower()
        return cls.SHORTCUTS.get(expr, expr)

    @classmethod
    def match_part(cls, val: int, part: str) -> bool:
        if part == "*":
            return True
        if "/" in part:
            subparts = part.split("/")
            step = int(subparts[1])
            base = 0 if subparts[0] == "*" else int(subparts[0])
            return (val - base) % step == 0
        if "," in part:
            items = [int(p) for p in part.split(",")]
            return val in items
        if "-" in part:
            start, end = [int(p) for p in part.split("-")]
            return start <= val <= end
        return int(part) == val

    @classmethod
    def is_due(
        cls,
        cron_expr: str,
        last_run_at: Optional[datetime],
        current_time: Optional[datetime] = None,
    ) -> bool:
        """Determines if a cron job is due to execute at current_time."""
        now = current_time or datetime.now()
        expr = cls.normalize_expr(cron_expr)

        # Support interval:<seconds>
        if expr.startswith("interval:"):
            try:
                seconds = int(expr.split("interval:")[1])
                if last_run_at is None:
                    return True
                return (now - last_run_at).total_seconds() >= seconds
            except Exception:
                return False

        parts = expr.split()
        if len(parts) != 5:
            return False

        min_part, hour_part, dom_part, mon_part, dow_part = parts

        # If already ran within the current minute, do not run again
        if last_run_at:
            if (
                last_run_at.year == now.year
                and last_run_at.month == now.month
                and last_run_at.day == now.day
                and last_run_at.hour == now.hour
                and last_run_at.minute == now.minute
            ):
                return False

        # Evaluate cron fields
        # dow: 0=Sunday in cron, Python now.weekday() has 0=Monday, 6=Sunday -> convert
        cron_dow = (now.weekday() + 1) % 7

        try:
            matches = (
                cls.match_part(now.minute, min_part)
                and cls.match_part(now.hour, hour_part)
                and cls.match_part(now.day, dom_part)
                and cls.match_part(now.month, mon_part)
                and cls.match_part(cron_dow, dow_part)
            )
            return matches
        except Exception:
            return False

    @classmethod
    def estimate_next_run(cls, cron_expr: str, from_time: Optional[datetime] = None) -> datetime:
        """Estimate the next run time within 7 days."""
        base = from_time or datetime.now()
        expr = cls.normalize_expr(cron_expr)

        if expr.startswith("interval:"):
            try:
                seconds = int(expr.split("interval:")[1])
                return base + timedelta(seconds=seconds)
            except Exception:
                return base + timedelta(hours=1)

        # Advance minute by minute up to 7 days (10080 minutes)
        cur = base.replace(second=0, microsecond=0) + timedelta(minutes=1)
        for _ in range(10080):
            if cls.is_due(expr, last_run_at=None, current_time=cur):
                return cur
            cur += timedelta(minutes=1)

        return base + timedelta(hours=24)
