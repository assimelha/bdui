import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
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
import { Toast } from './Toast';
import { FiltersBanner } from './FiltersBanner';
import { ConfirmDialog } from './ConfirmDialog';
import { CommandBar } from './CommandBar';
import { LAYOUT, hasActiveFilters } from '../utils/constants';
import { sortIssues } from '../utils/sorting';
import { Footer } from './Footer';
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
  const showJumpToPage = useBeadsStore(state => state.showJumpToPage);
  const toggleExportDialog = useBeadsStore(state => state.toggleExportDialog);
  const toggleThemeSelector = useBeadsStore(state => state.toggleThemeSelector);
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const getSelectedIssue = useBeadsStore(state => state.getSelectedIssue);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const sortConfig = useBeadsStore(state => state.sortConfig);
  const viewMode = useBeadsStore(state => state.viewMode);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();
  const filtersActive = hasActiveFilters(filter, searchQuery);

  // Apply filtering - rebuild byStatus from filtered issues
  const filteredData = useMemo(() => {
    if (!filtersActive) {
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
  }, [data, searchQuery, filter, getFilteredIssues, filtersActive]);

  // Apply sorting to each column
  const columnData = useMemo(() => {
    return {
      open: sortIssues(filteredData.byStatus.open, sortConfig.open.sortBy, sortConfig.open.sortOrder),
      in_progress: sortIssues(filteredData.byStatus.in_progress, sortConfig.in_progress.sortBy, sortConfig.in_progress.sortOrder),
      blocked: sortIssues(filteredData.byStatus.blocked, sortConfig.blocked.sortBy, sortConfig.blocked.sortOrder),
      closed: sortIssues(filteredData.byStatus.closed, sortConfig.closed.sortBy, sortConfig.closed.sortOrder),
    };
  }, [filteredData, sortConfig]);

  // Responsive layout calculations
  const COLUMN_WIDTH = LAYOUT.columnWidth;
  const DETAIL_PANEL_WIDTH = LAYOUT.detailPanelWidth;
  const MIN_WIDTH_FOR_DETAIL = COLUMN_WIDTH * 4 + DETAIL_PANEL_WIDTH + 10;
  const MIN_WIDTH_FOR_ALL_COLUMNS = COLUMN_WIDTH * 4 + 10;

  // Auto-hide detail panel on narrow screens
  const shouldShowDetails = showDetails && terminalWidth >= MIN_WIDTH_FOR_DETAIL;

  // Determine how many columns to show
  const visibleColumns = terminalWidth < MIN_WIDTH_FOR_ALL_COLUMNS && terminalWidth >= COLUMN_WIDTH * 2
    ? 2
    : terminalWidth < COLUMN_WIDTH * 2
    ? 1
    : 4;

  const statusConfig = [
    { key: 'open', title: 'Open' },
    { key: 'in_progress', title: 'In Progress' },
    { key: 'blocked', title: 'Blocked' },
    { key: 'closed', title: 'Closed' },
  ] as const;

  // Filter columns based on screen width
  const columnsToShow = statusConfig.slice(0, visibleColumns);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Toast message */}
      <Toast />

      {/* Header */}
      <Box flexDirection="column">
        <Box justifyContent="space-between">
          <Text bold color={theme.colors.primary}>
            BD TUI - Kanban Board
          </Text>
          <Text color={theme.colors.textDim}>
            {terminalWidth}x{terminalHeight} | Press ? for help
          </Text>
        </Box>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Total: <Text color={theme.colors.text}>{filteredData.stats.total}</Text></Text>
          <Text color={theme.colors.textDim}>Open: <Text color={theme.colors.statusOpen}>{filteredData.stats.open}</Text></Text>
          <Text color={theme.colors.textDim}>Blocked: <Text color={theme.colors.statusBlocked}>{filteredData.stats.blocked}</Text></Text>
          <Text color={theme.colors.textDim}>Closed: <Text color={theme.colors.statusClosed}>{filteredData.stats.closed}</Text></Text>
          {visibleColumns < 4 && (
            <Text color={theme.colors.warning}>[{4 - visibleColumns} hidden]</Text>
          )}
        </Box>
      </Box>

      {/* Filters banner */}
      <FiltersBanner />

      {/* Search Input */}
      {showSearch && <SearchInput />}

      {/* Filter Panel */}
      {showFilter && <FilterPanel />}

      {/* Main content */}
      <Box flexGrow={1} overflow="hidden">
        {/* Board columns */}
        <Box flexShrink={0}>
          {columnsToShow.map(({ key, title }, idx) => {
            const columnState = columnStates[key];
            return (
              <StatusColumn
                key={key}
                title={title}
                issues={columnData[key] || []}
                isActive={selectedColumn === idx}
                selectedIndex={columnState.selectedIndex}
                scrollOffset={columnState.scrollOffset}
                itemsPerPage={itemsPerPage}
                statusKey={key}
                sortConfig={sortConfig[key]}
              />
            );
          })}
        </Box>

        {/* Detail panel */}
        {shouldShowDetails && (
          <Box marginLeft={2} flexGrow={1} overflow="hidden">
            <DetailPanel issue={selectedIssue} maxHeight={terminalHeight - 10} />
          </Box>
        )}
        {showDetails && !shouldShowDetails && (
          <Box marginLeft={2} padding={1} borderStyle="single" borderColor={theme.colors.warning}>
            <Text color={theme.colors.warning}>
              Terminal too narrow for detail panel (need {MIN_WIDTH_FOR_DETAIL} cols)
            </Text>
          </Box>
        )}
      </Box>

      {/* Command Bar (vim-style) */}
      {showJumpToPage && <CommandBar />}

      {/* Footer */}
      <Footer currentView="kanban" />

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

      {/* Confirm Dialog */}
      <ConfirmDialog />
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
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const filter = useBeadsStore(state => state.filter);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const selectedIssue = getSelectedIssue();

  // Get filtered issues for stats view
  const filteredIssues = useMemo(() => {
    const filtersActive = hasActiveFilters(filter, searchQuery);
    if (!filtersActive) return data.issues;
    return getFilteredIssues();
  }, [data, filter, searchQuery, getFilteredIssues]);

  // Check minimum terminal width
  if (terminalWidth < LAYOUT.minTerminalWidth) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text color={theme.colors.error} bold>Terminal Too Narrow</Text>
        <Text color={theme.colors.text}>
          BD TUI requires at least {LAYOUT.minTerminalWidth} columns.
        </Text>
        <Text color={theme.colors.textDim}>
          Current width: {terminalWidth} columns
        </Text>
        <Text color={theme.colors.textDim} marginTop={1}>
          Please resize your terminal window.
        </Text>
      </Box>
    );
  }

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
          issues={filteredIssues}
          totalIssues={data.issues.length}
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

      {/* Confirm dialog - shared across all views */}
      <ConfirmDialog />
    </Box>
  );
}
