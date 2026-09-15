import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ArtifactPanel } from '../components/ArtifactPanel';
import { Artifact } from '../types/protocol';

const mockArtifacts: Artifact[] = [
  {
    id: 'art-1',
    task_id: 'task-1',
    type: 'file',
    title: 'Product Analytics',
    content: 'http://localhost:3000/analytics',
    verification_status: 'verified',
    created_at: '2026-09-15T00:00:00Z',
  },
];

describe('ArtifactPanel Component', () => {
  it('renders in docked state with Expand and Close buttons side-by-side', () => {
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
        lastDockedWidth={480}
      />
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveAttribute('data-state', 'docked');
    expect(aside).toHaveStyle({ width: '480px' });

    // Expand button verification
    const expandBtn = screen.getByRole('button', { name: 'Perbesar panel Artifacts' });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute('title', 'Perbesar preview');

    // Close button verification
    const closeBtn = screen.getByRole('button', { name: 'Tutup panel Artifacts' });
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn).toHaveAttribute('title', 'Tutup Artifacts');

    // Toolbar verification
    const toolbar = screen.getByRole('toolbar', { name: 'Kontrol panel Artifacts' });
    expect(toolbar).toContainElement(expandBtn);
    expect(toolbar).toContainElement(closeBtn);
  });

  it('triggers docked -> expanded state transition on Expand button click', () => {
    const handleStateChange = vi.fn();
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
        onPanelStateChange={handleStateChange}
      />
    );

    const expandBtn = screen.getByRole('button', { name: 'Perbesar panel Artifacts' });
    fireEvent.click(expandBtn);

    expect(handleStateChange).toHaveBeenCalledWith('expanded');
  });

  it('renders in expanded state and allows restoring back to docked', () => {
    const handleStateChange = vi.fn();
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="expanded"
        onPanelStateChange={handleStateChange}
        lastDockedWidth={480}
      />
    );

    const aside = screen.getByRole('complementary');
    expect(aside).toHaveAttribute('data-state', 'expanded');
    expect(aside).toHaveStyle({
      position: 'fixed',
      left: 'var(--app-sidebar-width, 256px)',
      right: '0px',
    });

    // Button should now be Restore
    const restoreBtn = screen.getByRole('button', { name: 'Kembalikan ukuran panel Artifacts' });
    expect(restoreBtn).toBeInTheDocument();
    expect(restoreBtn).toHaveAttribute('title', 'Kembalikan ukuran preview');

    fireEvent.click(restoreBtn);
    expect(handleStateChange).toHaveBeenCalledWith('docked');
  });

  it('restores from expanded to docked upon pressing Escape key', () => {
    const handleStateChange = vi.fn();
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="expanded"
        onPanelStateChange={handleStateChange}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(handleStateChange).toHaveBeenCalledWith('docked');
  });

  it('triggers docked -> closed state transition on Close button click', () => {
    const handleStateChange = vi.fn();
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
        onPanelStateChange={handleStateChange}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Tutup panel Artifacts' });
    fireEvent.click(closeBtn);

    expect(handleStateChange).toHaveBeenCalledWith('closed');
  });

  it('triggers expanded -> closed state transition directly on Close button click', () => {
    const handleStateChange = vi.fn();
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="expanded"
        onPanelStateChange={handleStateChange}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Tutup panel Artifacts' });
    fireEvent.click(closeBtn);

    expect(handleStateChange).toHaveBeenCalledWith('closed');
  });

  it('renders hidden container with zero space when state is closed', () => {
    const { container } = render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="closed"
      />
    );

    const aside = container.querySelector('aside[data-state="closed"]');
    expect(aside).toBeInTheDocument();
    expect(aside).toHaveClass('hidden');
    expect(aside).toHaveAttribute('aria-hidden', 'true');
  });

  it('supports tabs (Preview, Diff, Files) and Verification section in panel', () => {
    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
      />
    );

    expect(screen.getByRole('button', { name: 'Preview' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Diff' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Files' })).toBeInTheDocument();
    expect(screen.getByText('Verification')).toBeInTheDocument();
    expect(screen.getByText('4/4 checks passed')).toBeInTheDocument();
  });

  it('triggers onDockedWidthChange when dragging the left resize handle in docked mode', () => {
    const handleWidthChange = vi.fn();
    const { container } = render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
        lastDockedWidth={480}
        onDockedWidthChange={handleWidthChange}
      />
    );

    const resizeHandle = container.querySelector('div[title="Geser untuk mengatur lebar panel"]');
    expect(resizeHandle).toBeInTheDocument();

    // Mouse down to start resize
    fireEvent.mouseDown(resizeHandle!);

    // Mouse move to simulate drag
    fireEvent.mouseMove(window, { clientX: 600 });
    expect(handleWidthChange).toHaveBeenCalled();

    // Mouse up to end resize
    fireEvent.mouseUp(window);
  });

  it('transfers focus to reopenButtonRef when Close button is clicked', async () => {
    const handleStateChange = vi.fn();
    const reopenButton = document.createElement('button');
    document.body.appendChild(reopenButton);
    const reopenRef = { current: reopenButton } as React.RefObject<HTMLButtonElement>;

    render(
      <ArtifactPanel
        artifacts={mockArtifacts}
        panelState="docked"
        onPanelStateChange={handleStateChange}
        reopenButtonRef={reopenRef}
      />
    );

    const closeBtn = screen.getByRole('button', { name: 'Tutup panel Artifacts' });
    fireEvent.click(closeBtn);

    // Wait for the setTimeout focus transfer
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(document.activeElement).toBe(reopenButton);

    document.body.removeChild(reopenButton);
  });
});
