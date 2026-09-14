"""Task Finite State Machine with validated transitions."""

from enum import Enum


class TaskState(str, Enum):
    QUEUED = "queued"
    PLANNING = "planning"
    AWAITING_APPROVAL = "awaiting_approval"
    EXECUTING = "executing"
    WAITING_EXTERNAL = "waiting_external"
    VERIFYING = "verifying"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    BLOCKED = "blocked"


ALLOWED_TRANSITIONS: dict[TaskState, set[TaskState]] = {
    TaskState.QUEUED: {TaskState.PLANNING, TaskState.CANCELLED, TaskState.FAILED},
    TaskState.PLANNING: {
        TaskState.EXECUTING,
        TaskState.AWAITING_APPROVAL,
        TaskState.FAILED,
        TaskState.CANCELLED,
    },
    TaskState.EXECUTING: {
        TaskState.AWAITING_APPROVAL,
        TaskState.VERIFYING,
        TaskState.COMPLETED,
        TaskState.FAILED,
        TaskState.CANCELLED,
        TaskState.BLOCKED,
    },
    TaskState.AWAITING_APPROVAL: {
        TaskState.EXECUTING,
        TaskState.CANCELLED,
        TaskState.FAILED,
    },
    TaskState.WAITING_EXTERNAL: {
        TaskState.EXECUTING,
        TaskState.CANCELLED,
        TaskState.FAILED,
    },
    TaskState.VERIFYING: {
        TaskState.COMPLETED,
        TaskState.EXECUTING,
        TaskState.FAILED,
        TaskState.CANCELLED,
    },
    # Terminal states
    TaskState.COMPLETED: set(),
    TaskState.FAILED: {TaskState.QUEUED},  # Allow restart
    TaskState.CANCELLED: {TaskState.QUEUED},  # Allow restart
    TaskState.BLOCKED: {TaskState.EXECUTING, TaskState.CANCELLED},
}


class InvalidStateTransition(Exception):
    pass


class TaskStateMachine:
    def __init__(self, initial_state: TaskState = TaskState.QUEUED):
        self.state = initial_state

    def can_transition(self, target_state: TaskState) -> bool:
        allowed = ALLOWED_TRANSITIONS.get(self.state, set())
        return target_state in allowed

    def transition(self, target_state: TaskState) -> TaskState:
        if not self.can_transition(target_state):
            raise InvalidStateTransition(
                f"Cannot transition task from '{self.state.value}' to '{target_state.value}'"
            )
        self.state = target_state
        return self.state

    @property
    def is_terminal(self) -> bool:
        return self.state in {
            TaskState.COMPLETED,
            TaskState.FAILED,
            TaskState.CANCELLED,
        }
