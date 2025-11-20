import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { StatusColumn } from './StatusColumn';
import { DetailPanel } from './DetailPanel';
import { HelpOverlay } from './HelpOverlay';
import { TreeView } from './TreeView';
import { DependencyGraph } from './DependencyGraph';
import { SearchInput } from './SearchInput';
import { FilterPanel } from './FilterPanel';
import { CreateIssueForm } from './CreateIssueForm';
import { EditIssueForm } from './EditIssueForm';
import { ExportDialog } from './ExportDialog';
import { ThemeSelector } from './ThemeSelector';
import { StatsView } from './StatsView';
import type { Issue } from '../types';

function KanbanView() {
  const data = useBeadsStore(state => state.data);
  const selectedColumn = useBeadsStore(state => state.selectedColumn);
  const columnStates = useBeadsStore(state => state.columnStates);
  const itemsPerPage = useBeadsStore(state => state.itemsPerPage);
  const showDetails = useBeadsStore(state => state.showDetails);
  const showSearch = useBeadsStore(state => state.showSearch);
  const showFilter = useBeadsStore(state => state.showFilter);
  const showExportDialog = useBeadsStore(state => state.showExportDialog);
  const showThemeSelector = useBeadsStore(state => state.showThemeSelector);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const notificationsEnabled = useBeadsStore(state => state.notificationsEnabled);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);

  const selectedIssue = getSelectedIssue();

  // Apply filtering - rebuild byStatus from filtered issues
  const filteredData = useMemo(() => {
    const hasActiveFilters = searchQuery.trim() || filter.assignee || filter.status || filter.priority !== undefined || (filter.tags && filter.tags.length > 0);

    if (!hasActiveFilters) {
      return data;
    }

    const filteredIssues = getFilteredIssues();

    // Rebuild byStatus structure
    const byStatus: Record<string, Issue[]> = {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    };

    filteredIssues.forEach(issue => {
      if (byStatus[issue.status]) {
        byStatus[issue.status].push(issue);
      }
    });

    return {
      ...data,
      byStatus,
      issues: filteredIssues,
      stats: {
        total: filteredIssues.length,
        open: byStatus.open.length,
        closed: byStatus.closed.length,
        blocked: byStatus.blocked.length,
      },
    };
  }, [data, searchQuery, filter, getFilteredIssues]);

  // Responsive layout calculations
  const COLUMN_WIDTH = 37;
  const DETAIL_PANEL_WIDTH = 55;
  const MIN_WIDTH_FOR_DETAIL = COLUMN_WIDTH * 4 + DETAIL_PANEL_WIDTH + 10; // 4 columns + detail + padding
  const MIN_WIDTH_FOR_ALL_COLUMNS = COLUMN_WIDTH * 4 + 10; // 4 columns + padding

  // Auto-hide detail panel on narrow screens
  const shouldShowDetails = showDetails && terminalWidth >= MIN_WIDTH_FOR_DETAIL;

  // Determine how many columns to show
  const visibleColumns = terminalWidth < MIN_WIDTH_FOR_ALL_COLUMNS && terminalWidth >= COLUMN_WIDTH * 2
    ? 2 // Show only 2 columns on narrow screens
    : terminalWidth < COLUMN_WIDTH * 2
    ? 1 // Show only 1 column on very narrow screens
    : 4; // Show all 4 columns on normal screens

  const statusConfig = [
    { key: 'open', title: 'Open', color: 'blue' },
    { key: 'in_progress', title: 'In Progress', color: 'yellow' },
    { key: 'blocked', title: 'Blocked', color: 'red' },
    { key: 'closed', title: 'Closed', color: 'green' },
  ] as const;

  // Filter columns based on screen width
  const columnsToShow = statusConfig.slice(0, visibleColumns);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header - compact */}
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            BD TUI - Kanban Board
          </Text>
          <Text dimColor>
            {terminalWidth}x{terminalHeight} | Press ? for help
          </Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>Total: <Text color="white">{filteredData.stats.total}</Text></Text>
          <Text dimColor>Open: <Text color="blue">{filteredData.stats.open}</Text></Text>
          <Text dimColor>Blocked: <Text color="red">{filteredData.stats.blocked}</Text></Text>
          <Text dimColor>Closed: <Text color="green">{filteredData.stats.closed}</Text></Text>
          {visibleColumns < 4 && (
            <Text dimColor color="yellow">[{4 - visibleColumns} hidden]</Text>
          )}
        </Box>
      </Box>

      {/* Search Input */}
      {showSearch && <SearchInput />}

      {/* Filter Panel */}
      {showFilter && <FilterPanel />}

      {/* Main content */}
      <Box>
        {/* Board columns - each with independent pagination */}
        <Box>
          {columnsToShow.map(({ key, title, color }, idx) => {
            const columnState = columnStates[key];
            return (
              <StatusColumn
                key={key}
                title={title}
                issues={filteredData.byStatus[key] || []}
                isActive={selectedColumn === idx}
                selectedIndex={columnState.selectedIndex}
                scrollOffset={columnState.scrollOffset}
                itemsPerPage={itemsPerPage}
                color={color}
              />
            );
          })}
        </Box>

        {/* Detail panel - auto-hide on narrow screens */}
        {shouldShowDetails && (
          <Box marginLeft={2}>
            <DetailPanel issue={selectedIssue} />
          </Box>
        )}
        {showDetails && !shouldShowDetails && (
          <Box marginLeft={2} padding={1} borderStyle="single" borderColor="yellow">
            <Text color="yellow">
              Terminal too narrow for detail panel (need {MIN_WIDTH_FOR_DETAIL} cols)
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer - compact */}
      <Box borderStyle="single" borderColor="gray" paddingX={1}>
        <Box justifyContent="space-between">
          <Text dimColor>
            N new | e edit | / search | f filter | c clear | 1-4 views | ? help | q quit
          </Text>
          <Text color={notificationsEnabled ? 'green' : 'gray'}>
            {notificationsEnabled ? '🔔 ON' : '🔕 OFF'}
          </Text>
        </Box>
      </Box>

      {/* Export Dialog */}
      {showExportDialog && selectedIssue && (
        <Box
          position="absolute"
          top={Math.floor(terminalHeight / 2) - 10}
          left={Math.floor(terminalWidth / 2) - 35}
        >
          <ExportDialog
            issue={selectedIssue}
            onClose={toggleExportDialog}
          />
        </Box>
      )}

      {/* Theme Selector */}
      {showThemeSelector && (
        <Box
          position="absolute"
          top={Math.floor(terminalHeight / 2) - 10}
          left={Math.floor(terminalWidth / 2) - 30}
        >
          <ThemeSelector onClose={toggleThemeSelector} />
        </Box>
      )}
    </Box>
  );
}

export function Board() {
  const viewMode = useBeadsStore(state => state.viewMode);
  const showHelp = useBeadsStore(state => state.showHelp);
  const data = useBeadsStore(state => state.data);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const returnToPreviousView = useBeadsStore(state => state.returnToPreviousView);
  const reloadCallback = useBeadsStore(state => state.reloadCallback);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);

  const selectedIssue = getSelectedIssue();

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Render view based on mode */}
      {viewMode === 'kanban' && <KanbanView />}
      {viewMode === 'tree' && <TreeView data={data} terminalHeight={terminalHeight} />}
      {viewMode === 'graph' && (
        <DependencyGraph
          data={data}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
        />
      )}
      {viewMode === 'stats' && (
        <StatsView
          data={data}
          terminalWidth={terminalWidth}
          terminalHeight={terminalHeight}
        />
      )}
      {viewMode === 'create-issue' && (
        <CreateIssueForm
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}
      {viewMode === 'edit-issue' && selectedIssue && (
        <EditIssueForm
          issue={selectedIssue}
          onClose={returnToPreviousView}
          onSuccess={() => {
            if (reloadCallback) reloadCallback();
          }}
        />
      )}

      {/* Help overlay - shared across all views */}
      {showHelp && <HelpOverlay />}
    </Box>
  );
}
