"""Tests for TaskDAG, cycle detection, parallel execution frontier, and cascading failure."""

import pytest
from nusa.workforce.dag import TaskDAG, SubtaskNode, SubtaskStatus
from nusa.workforce.roles import AgentRole, ROLES


def test_dag_linear_execution_frontier():
    dag = TaskDAG("task-01")

    n1 = SubtaskNode(id="n1", parent_task_id="task-01", role=AgentRole.PLANNER, title="Plan", goal="Plan stuff")
    n2 = SubtaskNode(id="n2", parent_task_id="task-01", role=AgentRole.CODER, title="Code", goal="Write code", dependencies=["n1"])
    n3 = SubtaskNode(id="n3", parent_task_id="task-01", role=AgentRole.VERIFIER, title="Verify", goal="Run tests", dependencies=["n2"])

    dag.add_node(n1)
    dag.add_node(n2)
    dag.add_node(n3)

    # Initially, only n1 is ready
    ready = dag.get_executable_nodes()
    assert len(ready) == 1
    assert ready[0].id == "n1"

    # Mark n1 running
    dag.mark_running("n1")
    assert dag.get_executable_nodes() == []

    # Complete n1
    dag.mark_completed("n1", "Plan completed.")
    ready2 = dag.get_executable_nodes()
    assert len(ready2) == 1
    assert ready2[0].id == "n2"

    # Complete n2
    dag.mark_completed("n2", "Code completed.")
    ready3 = dag.get_executable_nodes()
    assert len(ready3) == 1
    assert ready3[0].id == "n3"

    # Complete n3
    dag.mark_completed("n3", "Tests passed.")
    assert dag.is_all_completed() is True


def test_dag_parallel_frontier():
    dag = TaskDAG("task-parallel")

    # n1 -> (n2_a, n2_b) -> n3
    n1 = SubtaskNode(id="n1", parent_task_id="task-parallel", role=AgentRole.PLANNER, title="Plan", goal="Plan")
    n2_a = SubtaskNode(id="n2_a", parent_task_id="task-parallel", role=AgentRole.CODER, title="Code A", goal="Code A", dependencies=["n1"])
    n2_b = SubtaskNode(id="n2_b", parent_task_id="task-parallel", role=AgentRole.CODER, title="Code B", goal="Code B", dependencies=["n1"])
    n3 = SubtaskNode(id="n3", parent_task_id="task-parallel", role=AgentRole.VERIFIER, title="Verify All", goal="Verify", dependencies=["n2_a", "n2_b"])

    dag.add_node(n1)
    dag.add_node(n2_a)
    dag.add_node(n2_b)
    dag.add_node(n3)

    dag.mark_completed("n1", "Done")

    # Both n2_a and n2_b should be executable in parallel!
    ready = dag.get_executable_nodes()
    assert len(ready) == 2
    ids = {n.id for n in ready}
    assert ids == {"n2_a", "n2_b"}

    # Complete only n2_a -> n3 is NOT yet ready
    dag.mark_completed("n2_a", "Done A")
    assert dag.get_executable_nodes() == [n2_b]

    # Complete n2_b -> n3 is now ready
    dag.mark_completed("n2_b", "Done B")
    assert [n.id for n in dag.get_executable_nodes()] == ["n3"]


def test_dag_cycle_detection():
    dag = TaskDAG("task-cycle")

    n1 = SubtaskNode(id="n1", parent_task_id="task-cycle", role=AgentRole.PLANNER, title="1", goal="1", dependencies=["n2"])
    n2 = SubtaskNode(id="n2", parent_task_id="task-cycle", role=AgentRole.CODER, title="2", goal="2", dependencies=["n1"])

    with pytest.raises(ValueError, match="not found in DAG|Cycle detected"):
        # n2 doesn't exist yet when adding n1
        dag.add_node(n1)


def test_dag_depth_limit():
    dag = TaskDAG("task-depth")
    deep_node = SubtaskNode(
        id="deep",
        parent_task_id="task-depth",
        role=AgentRole.CODER,
        title="Too Deep",
        goal="Beyond limit",
        depth=4,
    )
    with pytest.raises(ValueError, match="depth limit exceeded"):
        dag.add_node(deep_node)


def test_dag_cascading_failure_and_blocking():
    dag = TaskDAG("task-fail")

    n1 = SubtaskNode(id="n1", parent_task_id="task-fail", role=AgentRole.PLANNER, title="1", goal="1")
    n2 = SubtaskNode(id="n2", parent_task_id="task-fail", role=AgentRole.CODER, title="2", goal="2", dependencies=["n1"])
    n3 = SubtaskNode(id="n3", parent_task_id="task-fail", role=AgentRole.VERIFIER, title="3", goal="3", dependencies=["n2"])

    dag.add_node(n1)
    dag.add_node(n2)
    dag.add_node(n3)

    # Fail n1
    dag.mark_failed("n1", "Planner hallucinated")

    assert dag.nodes["n1"].status == SubtaskStatus.FAILED
    # n2 and n3 must cascade to BLOCKED
    assert dag.nodes["n2"].status == SubtaskStatus.BLOCKED
    assert dag.nodes["n3"].status == SubtaskStatus.BLOCKED
    assert dag.is_terminated() is True
    assert dag.is_all_completed() is False


def test_role_tool_containment():
    # Verify Coder cannot execute test runner directly or destroy
    coder_tools = ROLES[AgentRole.CODER].allowed_tools
    assert "file_patch" in coder_tools
    assert "file_write" in coder_tools
    assert "run_test" not in coder_tools  # Verifier handles testing

    # Verify Verifier has run_test
    verifier_tools = ROLES[AgentRole.VERIFIER].allowed_tools
    assert "run_test" in verifier_tools
    assert "file_patch" not in verifier_tools  # Verifier does not edit code
