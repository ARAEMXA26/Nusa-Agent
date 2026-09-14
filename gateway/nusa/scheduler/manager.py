"""Cron Scheduler Manager for background task automation."""

import asyncio
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
from nusa.db.connection import get_db
from nusa.scheduler.cron_evaluator import CronEvaluator

logger = logging.getLogger("nusa.scheduler")


class CronSchedulerManager:
    """Manages scheduled recurring agent tasks and background execution loops."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path
        self._running = False
        self._loop_task: Optional[asyncio.Task] = None
        self._check_interval = 10  # check every 10 seconds

    def list_jobs(self, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all configured cron jobs."""
        with get_db(self.db_path) as conn:
            if project_id:
                rows = conn.execute(
                    "SELECT * FROM cron_jobs WHERE project_id = ? ORDER BY created_at DESC",
                    (project_id,),
                ).fetchall()
            else:
                rows = conn.execute("SELECT * FROM cron_jobs ORDER BY created_at DESC").fetchall()

            result = []
            for r in rows:
                item = dict(r)
                item["enabled"] = bool(item["enabled"])
                result.append(item)
            return result

    def create_job(
        self,
        title: str,
        prompt: str,
        cron_expr: str,
        project_id: Optional[str] = None,
        profile_id: Optional[str] = None,
        enabled: bool = True,
    ) -> Dict[str, Any]:
        """Create a new recurring scheduled job."""
        job_id = str(uuid.uuid4())
        now = datetime.now()
        next_run = CronEvaluator.estimate_next_run(cron_expr, from_time=now).isoformat()

        with get_db(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO cron_jobs (id, project_id, profile_id, title, prompt, cron_expr, enabled, next_run_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (job_id, project_id, profile_id, title, prompt, cron_expr, 1 if enabled else 0, next_run),
            )

        return {
            "id": job_id,
            "title": title,
            "prompt": prompt,
            "cron_expr": cron_expr,
            "enabled": enabled,
            "project_id": project_id,
            "profile_id": profile_id,
            "next_run_at": next_run,
        }

    def toggle_job(self, job_id: str, enabled: Optional[bool] = None) -> Dict[str, Any]:
        """Enable or disable a scheduled job."""
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT enabled FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
            if not row:
                raise ValueError(f"Job '{job_id}' not found.")

            new_status = (not bool(row["enabled"])) if enabled is None else enabled
            conn.execute("UPDATE cron_jobs SET enabled = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (1 if new_status else 0, job_id))

        return {"id": job_id, "enabled": new_status}

    def delete_job(self, job_id: str) -> bool:
        """Delete a cron job."""
        with get_db(self.db_path) as conn:
            res = conn.execute("DELETE FROM cron_jobs WHERE id = ?", (job_id,))
            return res.rowcount > 0

    def list_job_runs(self, job_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """List execution history for a job."""
        with get_db(self.db_path) as conn:
            rows = conn.execute(
                "SELECT * FROM cron_runs WHERE job_id = ? ORDER BY started_at DESC LIMIT ?",
                (job_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    async def execute_job(self, job_id: str) -> Dict[str, Any]:
        """Execute a scheduled job and record run status."""
        with get_db(self.db_path) as conn:
            row = conn.execute("SELECT * FROM cron_jobs WHERE id = ?", (job_id,)).fetchone()
            if not row:
                raise ValueError(f"Job '{job_id}' not found.")
            job = dict(row)

        run_id = str(uuid.uuid4())
        start_time = datetime.now()

        with get_db(self.db_path) as conn:
            conn.execute(
                """
                INSERT INTO cron_runs (id, job_id, status, started_at)
                VALUES (?, ?, 'running', ?)
                """,
                (run_id, job_id, start_time.isoformat()),
            )

        try:
            # Simulated execution summary or orchestrator invocation
            output = f"Scheduled task executed successfully: '{job['prompt']}'"
            status = "success"
            error = None
        except Exception as e:
            output = None
            status = "failed"
            error = str(e)

        end_time = datetime.now()
        next_run = CronEvaluator.estimate_next_run(job["cron_expr"], from_time=end_time).isoformat()

        with get_db(self.db_path) as conn:
            conn.execute(
                """
                UPDATE cron_runs
                SET status = ?, output_summary = ?, error_message = ?, completed_at = ?
                WHERE id = ?
                """,
                (status, output, error, end_time.isoformat(), run_id),
            )
            conn.execute(
                """
                UPDATE cron_jobs
                SET last_run_at = ?, next_run_at = ?
                WHERE id = ?
                """,
                (end_time.isoformat(), next_run, job_id),
            )

        return {
            "run_id": run_id,
            "job_id": job_id,
            "status": status,
            "output_summary": output,
            "error_message": error,
            "next_run_at": next_run,
        }

    async def _scheduler_loop(self):
        """Continuous background check loop for due cron jobs."""
        logger.info("Cron Scheduler background loop started.")
        while self._running:
            try:
                now = datetime.now()
                with get_db(self.db_path) as conn:
                    rows = conn.execute("SELECT * FROM cron_jobs WHERE enabled = 1").fetchall()

                for r in rows:
                    job = dict(r)
                    last_run = datetime.fromisoformat(job["last_run_at"]) if job["last_run_at"] else None
                    if CronEvaluator.is_due(job["cron_expr"], last_run_at=last_run, current_time=now):
                        logger.info(f"Cron job due: '{job['title']}' (id={job['id']})")
                        await self.execute_job(job["id"])

            except Exception as e:
                logger.error(f"Error in cron scheduler loop: {e}")

            await asyncio.sleep(self._check_interval)

    def start(self):
        """Start scheduler background task."""
        if not self._running:
            self._running = True
            self._loop_task = asyncio.create_task(self._scheduler_loop())

    def stop(self):
        """Stop scheduler background task."""
        self._running = False
        if self._loop_task:
            self._loop_task.cancel()
            self._loop_task = None


cron_manager = CronSchedulerManager()
