"""Tests for Cron Evaluator and Background Scheduler Manager."""

import tempfile
from datetime import datetime, timedelta
from pathlib import Path
import pytest
from nusa.scheduler.cron_evaluator import CronEvaluator
from nusa.scheduler.manager import CronSchedulerManager
from nusa.db.connection import init_db


def test_cron_evaluator_intervals_and_shortcuts():
    now = datetime(2026, 9, 14, 10, 30, 0)

    # 1. Interval
    assert CronEvaluator.is_due("interval:60", last_run_at=None, current_time=now) is True
    assert CronEvaluator.is_due("interval:60", last_run_at=now - timedelta(seconds=70), current_time=now) is True
    assert CronEvaluator.is_due("interval:60", last_run_at=now - timedelta(seconds=30), current_time=now) is False

    # 2. Hourly shortcut (@hourly -> 0 * * * *)
    hourly_time = datetime(2026, 9, 14, 11, 0, 0)
    assert CronEvaluator.is_due("@hourly", last_run_at=None, current_time=hourly_time) is True
    not_hourly = datetime(2026, 9, 14, 11, 15, 0)
    assert CronEvaluator.is_due("@hourly", last_run_at=None, current_time=not_hourly) is False

    # 3. Exact matching: 30 10 * * *
    assert CronEvaluator.is_due("30 10 * * *", last_run_at=None, current_time=now) is True
    assert CronEvaluator.is_due("31 10 * * *", last_run_at=None, current_time=now) is False


@pytest.mark.asyncio
async def test_cron_scheduler_job_lifecycle():
    with tempfile.TemporaryDirectory() as td:
        tpath = Path(td)
        test_db = tpath / "cron_test.sqlite"
        init_db(test_db)
        mgr = CronSchedulerManager(db_path=test_db)

        # Create job
        job = mgr.create_job(
            title="Daily Health Check",
            prompt="Inspect repository integrity and report status",
            cron_expr="@daily",
            enabled=True,
        )
        assert job["title"] == "Daily Health Check"
        job_id = job["id"]

        # List jobs
        jobs = mgr.list_jobs()
        assert len(jobs) >= 1
        assert any(j["id"] == job_id for j in jobs)

        # Toggle job
        toggled = mgr.toggle_job(job_id, enabled=False)
        assert toggled["enabled"] is False

        # Execute job manually
        run_res = await mgr.execute_job(job_id)
        assert run_res["status"] == "success"

        # Check runs history
        runs = mgr.list_job_runs(job_id)
        assert len(runs) == 1
        assert runs[0]["status"] == "success"

        # Delete job
        assert mgr.delete_job(job_id) is True
        assert len(mgr.list_jobs()) == 0
