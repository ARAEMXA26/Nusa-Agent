"""Unit tests for the Task Finite State Machine."""

import pytest
from nusa.core.state_machine import (
    TaskStateMachine,
    TaskState,
    InvalidStateTransition,
)


def test_initial_state():
    sm = TaskStateMachine()
    assert sm.state == TaskState.QUEUED
    assert not sm.is_terminal


def test_valid_transitions():
    sm = TaskStateMachine()
    assert sm.transition(TaskState.PLANNING) == TaskState.PLANNING
    assert sm.transition(TaskState.EXECUTING) == TaskState.EXECUTING
    assert sm.transition(TaskState.AWAITING_APPROVAL) == TaskState.AWAITING_APPROVAL
    assert sm.transition(TaskState.EXECUTING) == TaskState.EXECUTING
    assert sm.transition(TaskState.VERIFYING) == TaskState.VERIFYING
    assert sm.transition(TaskState.COMPLETED) == TaskState.COMPLETED
    assert sm.is_terminal


def test_invalid_transition_raises():
    sm = TaskStateMachine()
    # Cannot jump directly from QUEUED to COMPLETED without executing
    with pytest.raises(InvalidStateTransition):
        sm.transition(TaskState.COMPLETED)


def test_terminal_state_cannot_transition():
    sm = TaskStateMachine(TaskState.COMPLETED)
    assert sm.is_terminal
    with pytest.raises(InvalidStateTransition):
        sm.transition(TaskState.PLANNING)
