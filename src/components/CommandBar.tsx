import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { updateIssue } from '../bd/commands';

type CommandMode = 'command' | 'jump';

interface CommandResult {
  success: boolean;
  message: string;
}

export function CommandBar() {
  const { exit } = useApp();
  const showCommandBar = useBeadsStore(state => state.showJumpToPage);
  const toggleCommandBar = useBeadsStore(state => state.toggleJumpToPage);
  const jumpToPage = useBeadsStore(state => state.jumpToPage);
  const getTotalPages = useBeadsStore(state => state.getTotalPages);
  const getCurrentPage = useBeadsStore(state => state.getCurrentPage);
  const showToast = useBeadsStore(state => state.showToast);
  const setViewMode = useBeadsStore(state => state.setViewMode);
  const setTheme = useBeadsStore(state => state.setTheme);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const selectIssueById = useBeadsStore(state => state.selectIssueById);
  const reloadCallback = useBeadsStore(state => state.reloadCallback);
  const navigateToCreateIssue = useBeadsStore(state => state.navigateToCreateIssue);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);
  const clearFilters = useBeadsStore(state => state.clearFilters);
  const toggleHelp = useBeadsStore(state => state.toggleHelp);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const [input, setInput] = useState('');
  const totalPages = getTotalPages();
  const currentPage = getCurrentPage();
  const selectedIssue = getSelectedIssue();

  const parseAndExecute = async (cmd: string): Promise<CommandResult> => {
    const trimmed = cmd.trim().toLowerCase();
    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    // Pure number = jump to page
    if (/^\d+$/.test(trimmed)) {
      const page = parseInt(trimmed, 10);
      if (page >= 1 && page <= totalPages) {
        jumpToPage(page);
        return { success: true, message: `Jumped to page ${page}` };
      }
      return { success: false, message: `Invalid page (1-${totalPages})` };
    }

    // Jump to issue by ID (e.g., :BD-abc or :abc)
    if (trimmed.includes('-') || /^[a-z0-9]{6,}$/i.test(trimmed)) {
      const found = selectIssueById(trimmed);
      if (found) {
        return { success: true, message: `Found: ${trimmed}` };
      }
      return { success: false, message: `Issue not found: ${trimmed}` };
    }

    switch (command) {
      // Quit
      case 'q':
      case 'quit':
      case 'exit':
        exit();
        return { success: true, message: 'Bye!' };

      // Help
      case 'h':
      case 'help':
        toggleCommandBar();
        toggleHelp();
        return { success: true, message: '' };

      // Views
      case 'kanban':
      case 'k':
        setViewMode('kanban');
        return { success: true, message: 'Kanban view' };
      case 'tree':
      case 't':
        setViewMode('tree');
        return { success: true, message: 'Tree view' };
      case 'graph':
      case 'g':
        setViewMode('graph');
        return { success: true, message: 'Graph view' };
      case 'stats':
        setViewMode('stats');
        return { success: true, message: 'Stats view' };

      // Theme
      case 'theme':
        if (args[0]) {
          const validThemes = ['default', 'ocean', 'forest', 'sunset', 'monochrome'];
          if (validThemes.includes(args[0])) {
            setTheme(args[0] as any);
            return { success: true, message: `Theme: ${args[0]}` };
          }
          return { success: false, message: `Unknown theme. Try: ${validThemes.join(', ')}` };
        }
        return { success: false, message: 'Usage: :theme <name>' };

      // Status change
      case 's':
      case 'status':
        if (!selectedIssue) {
          return { success: false, message: 'No issue selected' };
        }
        const statusArg = args[0];
        const statusMap: Record<string, 'open' | 'closed' | 'in_progress' | 'blocked'> = {
          'o': 'open', 'open': 'open',
          'i': 'in_progress', 'in_progress': 'in_progress', 'ip': 'in_progress',
          'b': 'blocked', 'blocked': 'blocked',
          'c': 'closed', 'closed': 'closed',
        };
        const newStatus = statusMap[statusArg];
        if (newStatus) {
          try {
            await updateIssue({ id: selectedIssue.id, status: newStatus });
            if (reloadCallback) reloadCallback();
            return { success: true, message: `Status → ${newStatus}` };
          } catch (e) {
            return { success: false, message: `Failed: ${e}` };
          }
        }
        return { success: false, message: 'Usage: :s <o|i|b|c>' };

      // Priority change
      case 'p':
      case 'priority':
        if (!selectedIssue) {
          return { success: false, message: 'No issue selected' };
        }
        const prioArg = parseInt(args[0], 10);
        if (!isNaN(prioArg) && prioArg >= 0 && prioArg <= 4) {
          try {
            await updateIssue({ id: selectedIssue.id, priority: prioArg });
            if (reloadCallback) reloadCallback();
            return { success: true, message: `Priority → P${prioArg}` };
          } catch (e) {
            return { success: false, message: `Failed: ${e}` };
          }
        }
        return { success: false, message: 'Usage: :p <0-4>' };

      // New issue
      case 'new':
      case 'create':
        toggleCommandBar();
        navigateToCreateIssue();
        return { success: true, message: '' };

      // Edit issue
      case 'e':
      case 'edit':
        if (!selectedIssue) {
          return { success: false, message: 'No issue selected' };
        }
        toggleCommandBar();
        navigateToEditIssue();
        return { success: true, message: '' };

      // Clear filters
      case 'clear':
      case 'c':
        clearFilters();
        return { success: true, message: 'Filters cleared' };

      // Refresh
      case 'r':
      case 'refresh':
        if (reloadCallback) reloadCallback();
        return { success: true, message: 'Refreshed' };

      default:
        return { success: false, message: `Unknown command: ${command}` };
    }
  };

  useInput(async (char, key) => {
    if (!showCommandBar) return;

    if (key.escape) {
      setInput('');
      toggleCommandBar();
      return;
    }

    if (key.return) {
      if (input.trim()) {
        const result = await parseAndExecute(input);
        if (result.message) {
          showToast(result.message, result.success ? 'info' : 'error');
        }
      }
      setInput('');
      toggleCommandBar();
      return;
    }

    if (key.backspace || key.delete) {
      setInput(prev => prev.slice(0, -1));
      return;
    }

    // Accept alphanumeric, spaces, dashes, underscores
    if (/^[a-zA-Z0-9\s\-_]$/.test(char)) {
      setInput(prev => prev + char);
    }
  });

  if (!showCommandBar) return null;

  return (
    <Box borderStyle="single" borderColor={theme.colors.primary} paddingX={1}>
      <Text color={theme.colors.primary} bold>:</Text>
      <Text color={theme.colors.text}>{input}</Text>
      <Text color={theme.colors.textDim}>█</Text>
      <Box marginLeft={2}>
        <Text color={theme.colors.textDim}>
          {totalPages > 1 ? `pg ${currentPage}/${totalPages} | ` : ''}
          q quit | s status | p priority | help
        </Text>
      </Box>
    </Box>
  );
}
