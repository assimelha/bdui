import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { hasActiveFilters } from '../utils/constants';
import { Footer } from './Footer';

interface StatsViewProps {
  issues: Issue[];
  totalIssues: number;
  terminalWidth: number;
  terminalHeight: number;
}

export function StatsView({ issues, totalIssues, terminalWidth, terminalHeight }: StatsViewProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const filter = useBeadsStore(state => state.filter);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const theme = getTheme(currentTheme);

  const filtersActive = hasActiveFilters(filter, searchQuery);

  const stats = useMemo(() => {
    const statusCounts = {
      open: issues.filter(i => i.status === 'open').length,
      in_progress: issues.filter(i => i.status === 'in_progress').length,
      blocked: issues.filter(i => i.status === 'blocked').length,
      closed: issues.filter(i => i.status === 'closed').length,
    };

    const priorityCounts = {
      p0: issues.filter(i => i.priority === 0).length,
      p1: issues.filter(i => i.priority === 1).length,
      p2: issues.filter(i => i.priority === 2).length,
      p3: issues.filter(i => i.priority === 3).length,
      p4: issues.filter(i => i.priority === 4).length,
    };

    const typeCounts = {
      task: issues.filter(i => i.issue_type === 'task').length,
      epic: issues.filter(i => i.issue_type === 'epic').length,
      bug: issues.filter(i => i.issue_type === 'bug').length,
      feature: issues.filter(i => i.issue_type === 'feature').length,
      chore: issues.filter(i => i.issue_type === 'chore').length,
    };

    const assignees = new Map<string, number>();
    for (const issue of issues) {
      const assignee = issue.assignee || 'unassigned';
      assignees.set(assignee, (assignees.get(assignee) || 0) + 1);
    }

    const labels = new Map<string, number>();
    for (const issue of issues) {
      if (issue.labels) {
        for (const label of issue.labels) {
          labels.set(label, (labels.get(label) || 0) + 1);
        }
      }
    }

    const completionRate = issues.length > 0
      ? ((statusCounts.closed / issues.length) * 100).toFixed(0)
      : '0';

    const blockedRate = issues.length > 0
      ? ((statusCounts.blocked / issues.length) * 100).toFixed(0)
      : '0';

    const topAssignees = Array.from(assignees.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topLabels = Array.from(labels.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { statusCounts, priorityCounts, typeCounts, completionRate, blockedRate, topAssignees, topLabels };
  }, [issues]);

  const useWideLayout = terminalWidth >= 100;
  const columnWidth = useWideLayout ? Math.floor((terminalWidth - 4) / 2) : terminalWidth - 2;
  const labelWidth = 14;
  const barWidth = Math.max(10, columnWidth - labelWidth - 16); // padding, border, count, spacing

  // Pad label to fixed width
  const padLabel = (label: string) => label.padEnd(labelWidth);

  // Compact bar renderer
  const renderBar = (label: string, count: number, total: number, color: string) => {
    const filled = total > 0 ? Math.round((count / total) * barWidth) : 0;
    const empty = barWidth - filled;
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
      <Box>
        <Text color={color}>{padLabel(label)}</Text>
        <Text color={color}>{'█'.repeat(filled)}</Text>
        <Text color={theme.colors.textDim}>{'░'.repeat(empty)}</Text>
        <Text color={theme.colors.textDim}> {count} ({pct}%)</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box marginBottom={1} justifyContent="space-between">
        <Text bold color={theme.colors.primary}>Statistics</Text>
        <Box gap={2}>
          <Text color={theme.colors.text}>
            {issues.length}{filtersActive ? `/${totalIssues}` : ''} issues
          </Text>
          {filtersActive && <Text color={theme.colors.warning}>[filtered]</Text>}
          <Text color={theme.colors.textDim}>? help</Text>
        </Box>
      </Box>

      {/* Summary row */}
      <Box marginBottom={1} gap={3}>
        <Box gap={1}>
          <Text color={theme.colors.statusOpen}>●</Text>
          <Text>{stats.statusCounts.open} open</Text>
        </Box>
        <Box gap={1}>
          <Text color={theme.colors.statusInProgress}>●</Text>
          <Text>{stats.statusCounts.in_progress} in progress</Text>
        </Box>
        <Box gap={1}>
          <Text color={theme.colors.statusBlocked}>●</Text>
          <Text>{stats.statusCounts.blocked} blocked</Text>
        </Box>
        <Box gap={1}>
          <Text color={theme.colors.statusClosed}>●</Text>
          <Text>{stats.statusCounts.closed} closed</Text>
        </Box>
        <Text color={theme.colors.textDim}>│</Text>
        <Text color={theme.colors.success}>{stats.completionRate}% done</Text>
      </Box>

      {/* Main content */}
      <Box flexGrow={1} flexDirection={useWideLayout ? 'row' : 'column'} gap={1}>
        {/* Left column */}
        <Box flexDirection="column" width={columnWidth} gap={1}>
          {/* Status */}
          <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1}>
            <Text bold color={theme.colors.primary}>Status</Text>
            <Box flexDirection="column">
              {renderBar('Open', stats.statusCounts.open, issues.length, theme.colors.statusOpen)}
              {renderBar('In Progress', stats.statusCounts.in_progress, issues.length, theme.colors.statusInProgress)}
              {renderBar('Blocked', stats.statusCounts.blocked, issues.length, theme.colors.statusBlocked)}
              {renderBar('Closed', stats.statusCounts.closed, issues.length, theme.colors.statusClosed)}
            </Box>
          </Box>

          {/* Priority */}
          <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1}>
            <Text bold color={theme.colors.primary}>Priority</Text>
            <Box flexDirection="column">
              {renderBar('P4 Critical', stats.priorityCounts.p4, issues.length, theme.colors.priorityCritical)}
              {renderBar('P3 High', stats.priorityCounts.p3, issues.length, theme.colors.priorityHigh)}
              {renderBar('P2 Medium', stats.priorityCounts.p2, issues.length, theme.colors.priorityMedium)}
              {renderBar('P1 Low', stats.priorityCounts.p1, issues.length, theme.colors.priorityLow)}
              {renderBar('P0 Lowest', stats.priorityCounts.p0, issues.length, theme.colors.priorityLowest)}
            </Box>
          </Box>

          {/* Types */}
          <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1}>
            <Text bold color={theme.colors.primary}>Type</Text>
            <Box flexDirection="column">
              {stats.typeCounts.epic > 0 && renderBar('Epic', stats.typeCounts.epic, issues.length, theme.colors.typeEpic)}
              {stats.typeCounts.feature > 0 && renderBar('Feature', stats.typeCounts.feature, issues.length, theme.colors.typeFeature)}
              {stats.typeCounts.bug > 0 && renderBar('Bug', stats.typeCounts.bug, issues.length, theme.colors.typeBug)}
              {stats.typeCounts.task > 0 && renderBar('Task', stats.typeCounts.task, issues.length, theme.colors.typeTask)}
              {stats.typeCounts.chore > 0 && renderBar('Chore', stats.typeCounts.chore, issues.length, theme.colors.typeChore)}
            </Box>
          </Box>
        </Box>

        {/* Right column */}
        <Box flexDirection="column" width={columnWidth} gap={1}>
          {/* Assignees */}
          <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1}>
            <Text bold color={theme.colors.primary}>Assignees</Text>
            <Box flexDirection="column">
              {stats.topAssignees.length > 0 ? (
                stats.topAssignees.map(([assignee, count]) => {
                  const displayName = assignee.length > labelWidth - 1
                    ? assignee.slice(0, labelWidth - 2) + '…'
                    : assignee;
                  const color = assignee === 'unassigned' ? theme.colors.textDim : theme.colors.text;
                  return <Box key={assignee}>{renderBar(displayName, count, issues.length, color)}</Box>;
                })
              ) : (
                <Text color={theme.colors.textDim}>No assignees</Text>
              )}
            </Box>
          </Box>

          {/* Labels */}
          <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.border} paddingX={1}>
            <Text bold color={theme.colors.primary}>Labels</Text>
            <Box flexDirection="column">
              {stats.topLabels.length > 0 ? (
                stats.topLabels.map(([label, count]) => {
                  const displayLabel = '#' + (label.length > labelWidth - 2
                    ? label.slice(0, labelWidth - 3) + '…'
                    : label);
                  return <Box key={label}>{renderBar(displayLabel, count, issues.length, theme.colors.secondary)}</Box>;
                })
              ) : (
                <Text color={theme.colors.textDim}>No labels</Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Footer currentView="stats" />
    </Box>
  );
}
