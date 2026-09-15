import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { App } from '../App';

describe('App and Artifacts Panel Integration Flow', () => {
  it('handles full lifecycle: docked -> expanded -> docked -> closed -> reopened via button and shortcut', () => {
    const { container } = render(
      <I18nProvider>
        <App initialView="tasks" />
      </I18nProvider>
    );

    // 1. Initially docked
    const getArtifactsAside = () => container.querySelector('aside[data-state]');
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'docked');

    // Expand button is present
    const expandBtn = screen.getByRole('button', { name: 'Perbesar panel Artifacts' });
    expect(expandBtn).toBeInTheDocument();

    // 2. Click Expand -> transitions to expanded
    fireEvent.click(expandBtn);
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'expanded');

    // 3. Press Escape -> restores back to docked
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'docked');

    // 4. Click Close (×) -> closes panel
    const closeBtn = screen.getByRole('button', { name: 'Tutup panel Artifacts' });
    fireEvent.click(closeBtn);

    // Panel is now closed (hidden)
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'closed');
    expect(getArtifactsAside()).toHaveClass('hidden');

    // Reopen button in task breadcrumb appears
    const reopenBtns = screen.getAllByRole('button', { name: 'Buka panel Artifacts' });
    expect(reopenBtns.length).toBeGreaterThan(0);

    // 5. Click Reopen button -> restores to docked state
    fireEvent.click(reopenBtns[0]);
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'docked');

    // 6. Test global shortcut Cmd+Option+A to toggle
    fireEvent.keyDown(window, { key: 'a', metaKey: true, altKey: true });
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'closed');

    fireEvent.keyDown(window, { key: 'a', metaKey: true, altKey: true });
    expect(getArtifactsAside()).toHaveAttribute('data-state', 'docked');
  });
});
