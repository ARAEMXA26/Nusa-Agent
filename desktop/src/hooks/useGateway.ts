import { useState, useEffect, useCallback, useRef } from 'react';
import { Project, TaskDetail, Approval, Artifact, GatewayEvent } from '../types/protocol';

const API_BASE = 'http://127.0.0.1:4141';
const WS_URL = 'ws://127.0.0.1:4141/ws/events';

export function useGateway() {
  const [connected, setConnected] = useState<boolean>(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeTask, setActiveTask] = useState<TaskDetail | null>(null);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [recentEvents, setRecentEvents] = useState<GatewayEvent[]>([]);

  const wsRef = useRef<WebSocket | null>(null);

  // Connect WebSocket
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: any;

    const connect = () => {
      try {
        ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data: GatewayEvent = JSON.parse(event.data);
            setRecentEvents((prev) => [data, ...prev.slice(0, 50)]);

            // Real-time updates
            if (data.event === 'task.state_changed' || data.event === 'task.completed' || data.event === 'task.failed') {
              if (activeTask && activeTask.id === data.task_id) {
                fetchTaskDetail(data.task_id);
              }
              if (activeProject) {
                fetchTasks(activeProject.id);
              }
            } else if (data.event === 'message.delta') {
              if (activeTask && activeTask.id === data.task_id) {
                fetchTaskDetail(data.task_id);
              }
            } else if (data.event === 'tool.approval_required') {
              fetchApprovals();
              if (activeTask && activeTask.id === data.task_id) {
                fetchTaskDetail(data.task_id);
              }
            } else if (data.event === 'artifact.created') {
              if (activeTask && activeTask.id === data.task_id) {
                fetchArtifacts(data.task_id);
              }
            }
          } catch (e) {
            console.error('Failed to parse WS message', e);
          }
        };

        ws.onclose = () => {
          setConnected(false);
          reconnectTimeout = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch (err) {
        reconnectTimeout = setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeTask?.id, activeProject?.id]);

  // REST API Methods
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/projects`);
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (!activeProject && data.length > 0) {
          setActiveProject(data[0]);
        }
      }
    } catch (err) {
      console.warn('Gateway unavailable', err);
    }
  }, [activeProject]);

  const createProject = async (name: string, root_path: string) => {
    const res = await fetch(`${API_BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, root_path }),
    });
    if (res.ok) {
      const proj = await res.json();
      await fetchProjects();
      setActiveProject(proj);
      return proj;
    }
    throw new Error('Failed to create project');
  };

  const fetchTasks = useCallback(async (projectId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) {
      console.warn('Failed to fetch tasks', err);
    }
  }, []);

  const fetchTaskDetail = useCallback(async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/tasks/${taskId}`);
      if (res.ok) {
        const data: TaskDetail = await res.json();
        setActiveTask(data);
        fetchArtifacts(taskId);
      }
    } catch (err) {
      console.warn('Failed to fetch task detail', err);
    }
  }, []);

  const createTask = async (projectId: string, goal: string) => {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId, goal }),
    });
    if (res.ok) {
      const task: TaskDetail = await res.json();
      await fetchTasks(projectId);
      setActiveTask(task);
      return task;
    }
    throw new Error('Failed to create task');
  };

  const steerTask = async (taskId: string, message: string) => {
    await fetch(`${API_BASE}/api/tasks/${taskId}/steer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    await fetchTaskDetail(taskId);
  };

  const cancelTask = async (taskId: string) => {
    await fetch(`${API_BASE}/api/tasks/${taskId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled by user via UI' }),
    });
    await fetchTaskDetail(taskId);
  };

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/approvals?status=pending`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(data);
      }
    } catch (err) {
      console.warn('Failed to fetch approvals', err);
    }
  }, []);

  const respondApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    await fetch(`${API_BASE}/api/approvals/${approvalId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision }),
    });
    await fetchApprovals();
    if (activeTask) {
      await fetchTaskDetail(activeTask.id);
    }
  };

  const fetchArtifacts = async (taskId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/artifacts/task/${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setArtifacts(data);
      }
    } catch (err) {
      console.warn('Failed to fetch artifacts', err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchApprovals();
  }, [fetchProjects, fetchApprovals]);

  useEffect(() => {
    if (activeProject) {
      fetchTasks(activeProject.id);
    }
  }, [activeProject, fetchTasks]);

  return {
    connected,
    projects,
    activeProject,
    setActiveProject,
    tasks,
    activeTask,
    setActiveTask,
    approvals,
    artifacts,
    recentEvents,
    createProject,
    fetchTasks,
    fetchTaskDetail,
    createTask,
    steerTask,
    cancelTask,
    fetchApprovals,
    respondApproval,
  };
}
