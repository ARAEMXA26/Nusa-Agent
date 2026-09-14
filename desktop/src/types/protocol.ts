export type TaskState =
  | 'queued'
  | 'planning'
  | 'awaiting_approval'
  | 'executing'
  | 'waiting_external'
  | 'verifying'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'blocked';

export interface Project {
  id: string;
  name: string;
  root_path: string;
  default_model?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  created_at: string;
}

export interface ToolCall {
  id: string;
  tool_name: string;
  arguments: Record<string, any>;
  result?: Record<string, any> | null;
  status: 'pending' | 'approval_required' | 'executing' | 'succeeded' | 'failed' | 'rejected';
  duration_ms?: number | null;
  created_at: string;
}

export interface Approval {
  id: string;
  task_id: string;
  tool_call_id: string;
  action_type: string;
  description: string;
  payload_preview: string;
  status: 'pending' | 'approved' | 'rejected';
  decided_at?: string | null;
  decided_by?: string | null;
}

export interface Artifact {
  id: string;
  task_id: string;
  title: string;
  type: 'diff' | 'file' | 'plan' | 'test_report' | 'json';
  content: string;
  source_path?: string | null;
  verification_status: 'unverified' | 'verified' | 'failed';
  created_at?: string | null;
}

export interface TaskDetail {
  id: string;
  project_id: string;
  title: string;
  goal: string;
  status: TaskState;
  created_at: string;
  updated_at: string;
  messages: Message[];
  tool_calls: ToolCall[];
}

export interface GatewayEvent {
  event: string;
  task_id?: string;
  timestamp: string;
  payload: Record<string, any>;
}

export type AgentRole = 'planner' | 'coder' | 'reviewer' | 'verifier';

export type SubtaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'cancelled';

export interface SubtaskNode {
  id: string;
  parent_task_id: string;
  role: AgentRole;
  title: string;
  goal: string;
  dependencies: string[];
  status: SubtaskStatus;
  depth: number;
  result_summary?: string | null;
  error?: string | null;
  created_at: string;
  completed_at?: string | null;
}

export interface TaskDAGData {
  parent_task_id: string;
  nodes: SubtaskNode[];
  is_completed: boolean;
  is_terminated: boolean;
}
