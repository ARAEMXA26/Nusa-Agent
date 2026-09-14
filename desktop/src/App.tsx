import React, { useState } from 'react';
import { useGateway } from './hooks/useGateway';
import { Sidebar } from './components/Sidebar';
import { AgentManager } from './components/AgentManager';
import { ApprovalsInbox } from './components/ApprovalsInbox';
import { TaskTimeline } from './components/TaskTimeline';
import { ArtifactPanel } from './components/ArtifactPanel';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  const {
    connected,
    projects,
    activeProject,
    setActiveProject,
    tasks,
    activeTask,
    approvals,
    artifacts,
    createProject,
    fetchTaskDetail,
    createTask,
    steerTask,
    cancelTask,
    respondApproval,
  } = useGateway();

  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 font-sans text-neutral-100 antialiased">
      {/* Sidebar */}
      <Sidebar
        connected={connected}
        projects={projects}
        activeProject={activeProject}
        setActiveProject={setActiveProject}
        tasks={tasks}
        activeTaskId={activeTask?.id || null}
        onSelectTask={(taskId) => fetchTaskDetail(taskId)}
        onCreateProject={(name, path) => createProject(name, path)}
        onOpenSettings={() => setShowSettings(true)}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col h-screen min-w-0">
        {/* Agent Status Bar */}
        <AgentManager
          activeTask={activeTask}
          onCancelTask={activeTask ? () => cancelTask(activeTask.id) : undefined}
        />

        {/* Approvals Inbox (Visible if any pending approvals) */}
        <ApprovalsInbox
          approvals={approvals}
          onRespond={(apprId, decision) => respondApproval(apprId, decision)}
        />

        {/* Task Timeline & Steering */}
        <TaskTimeline
          activeTask={activeTask}
          onSteer={(msg) => activeTask && steerTask(activeTask.id, msg)}
          onCancel={() => activeTask && cancelTask(activeTask.id)}
          onCreateTask={(goal) => activeProject && createTask(activeProject.id, goal)}
        />
      </main>

      {/* Right-side Artifact & Verification Panel */}
      <ArtifactPanel artifacts={artifacts} />

      {/* Settings Modal */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
};
export default App;
