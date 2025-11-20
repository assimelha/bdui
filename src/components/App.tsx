import React, { useEffect, useState } from 'react';
import { Box, Text, useInput, useApp, useStdout } from 'ink';
import { useBeadsStore } from '../state/store';
import { Board } from './Board';
import { BeadsWatcher } from '../bd/watcher';
import { loadBeads, findBeadsDir } from '../bd/parser';

export function App() {
  const { exit } = useApp();
  const { stdout } = useStdout();
  const setData = useBeadsStore(state => state.setData);
  const setTerminalSize = useBeadsStore(state => state.setTerminalSize);
  const setReloadCallback = useBeadsStore(state => state.setReloadCallback);
  const [beadsPath, setBeadsPath] = useState<string | null>(null);
  const [watcher, setWatcher] = useState<BeadsWatcher | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Update terminal dimensions
  useEffect(() => {
    if (stdout) {
      const updateSize = () => {
        setTerminalSize(stdout.columns, stdout.rows);
      };

      updateSize();

      // Listen for resize events
      stdout.on('resize', updateSize);

      return () => {
        stdout.off('resize', updateSize);
      };
    }
  }, [stdout, setTerminalSize]);

  // Find and load .beads/ directory on mount
  useEffect(() => {
    async function init() {
      try {
        const path = await findBeadsDir();

        if (!path) {
          setError('No .beads/ directory found in current or parent directories');
          setLoading(false);
          return;
        }

        setBeadsPath(path);

        // Load initial data
        const data = await loadBeads(path);
        setData(data);

        // Set up watcher
        const watcher = new BeadsWatcher(path);
        watcher.subscribe((data) => {
          setData(data);
        });
        watcher.start();
        setWatcher(watcher);

        // Set reload callback in store
        setReloadCallback(() => {
          watcher.reload();
        });

        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    }

    init();

    // Cleanup
    return () => {
      if (watcher) {
        watcher.stop();
      }
    };
  }, []);

  // Keyboard navigation
  const moveUp = useBeadsStore(state => state.moveUp);
  const moveDown = useBeadsStore(state => state.moveDown);
  const moveLeft = useBeadsStore(state => state.moveLeft);
  const moveRight = useBeadsStore(state => state.moveRight);
  const toggleHelp = useBeadsStore(state => state.toggleHelp);
  const toggleDetails = useBeadsStore(state => state.toggleDetails);
  const toggleNotifications = useBeadsStore(state => state.toggleNotifications);
  const toggleSearch = useBeadsStore(state => state.toggleSearch);
  const toggleFilter = useBeadsStore(state => state.toggleFilter);
  const navigateToCreateIssue = useBeadsStore(state => state.navigateToCreateIssue);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const clearFilters = useBeadsStore(state => state.clearFilters);
  const setViewMode = useBeadsStore(state => state.setViewMode);
  const viewMode = useBeadsStore(state => state.viewMode);
  const showSearch = useBeadsStore(state => state.showSearch);
  const showFilter = useBeadsStore(state => state.showFilter);
  const showExportDialog = useBeadsStore(state => state.showExportDialog);
  const showThemeSelector = useBeadsStore(state => state.showThemeSelector);

  // Handle keyboard input
  useInput((input, key) => {
    const inFormView = viewMode === 'create-issue' || viewMode === 'edit-issue';

    // Handle 'q' key - disabled in forms, quits directly otherwise
    if (input === 'q') {
      if (inFormView) {
        // 'q' does nothing in forms (allows typing 'q')
        return;
      }
      // Not in form view, quit directly
      exit();
    }

    // Ctrl+C always quits (handled by Ink/system)

    // Always allow help
    if (input === '?') {
      toggleHelp();
    }

    // If in form view, allow ESC to return to previous view
    if (viewMode === 'create-issue' || viewMode === 'edit-issue') {
      if (key.escape) {
        returnToPreviousView();
      }
      // Let form components handle all other input
      return;
    }

    // If search, filter, export dialog, or theme selector are active, let those components handle input
    // (they handle ESC to close themselves)
    if (showSearch || showFilter || showExportDialog || showThemeSelector) {
      return;
    }

    // Refresh
    if (input === 'r') {
      if (watcher) {
        watcher.reload();
      }
    }

    // Toggle search
    if (input === '/') {
      toggleSearch();
      return;
    }

    // Toggle filter
    if (input === 'f') {
      toggleFilter();
      return;
    }

    // Clear filters
    if (input === 'c') {
      clearFilters();
      return;
    }

    // Create new issue
    if (input === 'N') { // Shift+N
      navigateToCreateIssue();
      return;
    }

    // Edit issue
    if (input === 'e') {
      navigateToEditIssue();
      return;
    }

    // Export issue
    if (input === 'x') {
      toggleExportDialog();
      return;
    }

    // Theme selector
    if (input === 't') {
      toggleThemeSelector();
      return;
    }

    // Detail panel
    if (key.return || input === ' ') {
      toggleDetails();
    }

    // Toggle notifications
    if (input === 'n') {
      toggleNotifications();
    }

    // View switching
    if (input === '1') {
      setViewMode('kanban');
    }
    if (input === '2') {
      setViewMode('tree');
    }
    if (input === '3') {
      setViewMode('graph');
    }
    if (input === '4') {
      setViewMode('stats');
    }

    // Navigation - Arrow keys
    if (key.upArrow || input === 'k') {
      moveUp();
    }
    if (key.downArrow || input === 'j') {
      moveDown();
    }
    if (key.leftArrow || input === 'h') {
      moveLeft();
    }
    if (key.rightArrow || input === 'l') {
      moveRight();
    }
  });

  if (loading) {
    return (
      <Box padding={1}>
        <Text color="cyan">Loading beads...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color="red" bold>Error:</Text>
        <Text color="red">{error}</Text>
        <Text dimColor marginTop={1}>
          Make sure you're in a directory with a .beads/ folder
        </Text>
      </Box>
    );
  }

  return <Board />;
}
