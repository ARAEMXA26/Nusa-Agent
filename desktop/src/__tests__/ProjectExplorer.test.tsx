import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectExplorer, getFileIcon } from '../components/ProjectExplorer';
import { CodeWorkspaceEditor, OpenTab } from '../components/CodeWorkspaceEditor';
import { Sidebar } from '../components/Sidebar';

describe('Coding-First Workspace: ProjectExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly with root path and project title', () => {
    render(
      <ProjectExplorer
        rootPath="/Users/ariardianto/Documents/AGENT/CODE"
        projectName="CODE"
        activeFilePath={null}
        onSelectFile={vi.fn()}
        onOpenFolderPicker={vi.fn()}
      />
    );

    expect(screen.getByText('Explorer')).toBeInTheDocument();
    expect(screen.getByText('CODE')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Cari file...')).toBeInTheDocument();
  });

  it('renders empty state with "Open Project" button when rootPath is null', () => {
    const handleOpenFolder = vi.fn();
    render(
      <ProjectExplorer
        rootPath={null}
        activeFilePath={null}
        onSelectFile={vi.fn()}
        onOpenFolderPicker={handleOpenFolder}
      />
    );

    expect(screen.getByText('Belum ada project yang dibuka')).toBeInTheDocument();
    const openBtn = screen.getByRole('button', { name: /Open Project/i });
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);
    expect(handleOpenFolder).toHaveBeenCalledTimes(1);
  });

  it('returns correct icons and badges from getFileIcon', () => {
    const tsxIcon = getFileIcon('App.tsx', false, false);
    expect(tsxIcon).toBeTruthy();

    const jsonIcon = getFileIcon('package.json', false, false);
    expect(jsonIcon).toBeTruthy();

    const dirClosed = getFileIcon('src', true, false);
    expect(dirClosed).toBeTruthy();

    const dirOpen = getFileIcon('src', true, true);
    expect(dirOpen).toBeTruthy();
  });
});

describe('Coding-First Workspace: CodeWorkspaceEditor', () => {
  const sampleTabs: OpenTab[] = [
    {
      path: '/Users/ariardianto/Documents/AGENT/CODE/desktop/electron-builder.json',
      name: 'electron-builder.json',
      relativePath: 'desktop/electron-builder.json',
      content: '{\n  "appId": "com.nusa.agent"\n}',
      originalContent: '{\n  "appId": "com.nusa.agent"\n}',
      isDirty: false,
      language: 'json',
      diagnosticsCount: 3,
    },
    {
      path: '/Users/ariardianto/Documents/AGENT/CODE/desktop/src/components/ErrorBoundary.tsx',
      name: 'ErrorBoundary.tsx',
      relativePath: 'desktop/src/components/ErrorBoundary.tsx',
      content: 'export class ErrorBoundary {}',
      originalContent: 'export class ErrorBoundary {}',
      isDirty: true,
      language: 'typescript',
    },
  ];

  it('renders tabs bar with file names, badges, and breadcrumbs matching Image 2', () => {
    render(
      <CodeWorkspaceEditor
        tabs={sampleTabs}
        activeTabIndex={0}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onUpdateContent={vi.fn()}
        onSaveFile={vi.fn().mockResolvedValue(undefined)}
        rootPath="/Users/ariardianto/Documents/AGENT/CODE"
      />
    );

    expect(screen.getAllByText('electron-builder.json').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('ErrorBoundary.tsx')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1); // diagnostics badge
    expect(screen.getByText('desktop')).toBeInTheDocument(); // breadcrumb part
  });

  it('renders bottom terminal panel with interactive tabs', () => {
    render(
      <CodeWorkspaceEditor
        tabs={sampleTabs}
        activeTabIndex={0}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onUpdateContent={vi.fn()}
        onSaveFile={vi.fn().mockResolvedValue(undefined)}
        rootPath="/Users/ariardianto/Documents/AGENT/CODE"
      />
    );

    expect(screen.getAllByRole('button', { name: /TERMINAL/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole('button', { name: /PROBLEMS/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OUTPUT/i })).toBeInTheDocument();
  });

  it('allows switching to edit mode and typing code', () => {
    const handleUpdate = vi.fn();
    const { container } = render(
      <CodeWorkspaceEditor
        tabs={sampleTabs}
        activeTabIndex={0}
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        onUpdateContent={handleUpdate}
        onSaveFile={vi.fn().mockResolvedValue(undefined)}
        rootPath="/Users/ariardianto/Documents/AGENT/CODE"
      />
    );

    const editBtn = screen.getByTitle('Edit Source Code');
    fireEvent.click(editBtn);

    const textarea = container.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    if (textarea) {
      fireEvent.change(textarea, { target: { value: '{\n  "version": "1.0.0"\n}' } });
      expect(handleUpdate).toHaveBeenCalledWith(0, '{\n  "version": "1.0.0"\n}');
    }
  });
});

describe('Sidebar: Multi-Mode Navigation & Activity Rail', () => {
  const dummyProjects: any[] = [];
  const dummyTasks: any[] = [];

  it('renders compact Activity Rail matching Image 3 when sidebarMode is compact', () => {
    render(
      <Sidebar
        connected={true}
        sidebarMode="compact"
        primaryView="projects"
        projects={dummyProjects}
        activeProject={null}
        setActiveProject={vi.fn()}
        tasks={dummyTasks}
        activeTaskId={null}
        onSelectTask={vi.fn()}
        onSelectDashboard={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenNewTask={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenSkills={vi.fn()}
        onOpenMcp={vi.fn()}
        onOpenBrowser={vi.fn()}
        onOpenMemory={vi.fn()}
        onOpenExtensions={vi.fn()}
      />
    );

    const rail = screen.getByTestId('activity-rail');
    expect(rail).toBeInTheDocument();
    expect(screen.getByLabelText('Explorer')).toBeInTheDocument();
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
    expect(screen.getByLabelText('Source Control')).toBeInTheDocument();
  });

  it('renders expanded sidebar when sidebarMode is expanded', () => {
    const handleSelectProjects = vi.fn();
    render(
      <Sidebar
        connected={true}
        sidebarMode="expanded"
        primaryView="projects"
        onSelectProjects={handleSelectProjects}
        projects={dummyProjects}
        activeProject={null}
        setActiveProject={vi.fn()}
        tasks={dummyTasks}
        activeTaskId={null}
        onSelectTask={vi.fn()}
        onSelectDashboard={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenNewTask={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenSkills={vi.fn()}
        onOpenMcp={vi.fn()}
        onOpenBrowser={vi.fn()}
        onOpenMemory={vi.fn()}
        onOpenExtensions={vi.fn()}
      />
    );

    expect(screen.getByTestId('sidebar-expanded')).toBeInTheDocument();
    expect(screen.getByText('NUSA AGENT')).toBeInTheDocument();
    expect(screen.getByText('New Task')).toBeInTheDocument();

    const projectsBtn = screen.getByRole('button', { name: /Projects/i });
    fireEvent.click(projectsBtn);
    expect(handleSelectProjects).toHaveBeenCalled();
  });

  it('renders hidden mode with restore button when sidebarMode is hidden', () => {
    const handleModeChange = vi.fn();
    render(
      <Sidebar
        connected={true}
        sidebarMode="hidden"
        onSidebarModeChange={handleModeChange}
        primaryView="projects"
        projects={dummyProjects}
        activeProject={null}
        setActiveProject={vi.fn()}
        tasks={dummyTasks}
        activeTaskId={null}
        onSelectTask={vi.fn()}
        onSelectDashboard={vi.fn()}
        onCreateProject={vi.fn()}
        onOpenNewTask={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenSkills={vi.fn()}
        onOpenMcp={vi.fn()}
        onOpenBrowser={vi.fn()}
        onOpenMemory={vi.fn()}
        onOpenExtensions={vi.fn()}
      />
    );

    const restoreBtn = screen.getByLabelText('Tampilkan Sidebar');
    expect(restoreBtn).toBeInTheDocument();

    fireEvent.click(restoreBtn);
    expect(handleModeChange).toHaveBeenCalledWith('expanded');
  });
});
