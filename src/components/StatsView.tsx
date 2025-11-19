import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import type { BeadsData } from '../types';

interface StatsViewProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

export function StatsView({ data, terminalWidth, terminalHeight }: StatsViewProps) {
  const stats = useMemo(() => {
    const { issues } = data;

    // Status breakdown
    const statusCounts = {
      open: issues.filter(i => i.status === 'open').length,
      in_progress: issues.filter(i => i.status === 'in_progress').length,
      blocked: issues.filter(i => i.status === 'blocked').length,
      closed: issues.filter(i => i.status === 'closed').length,
    };

    // Priority breakdown
    const priorityCounts = {
      p0: issues.filter(i => i.priority === 0).length,
      p1: issues.filter(i => i.priority === 1).length,
      p2: issues.filter(i => i.priority === 2).length,
      p3: issues.filter(i => i.priority === 3).length,
      p4: issues.filter(i => i.priority === 4).length,
    };

    // Type breakdown
    const typeCounts = {
      task: issues.filter(i => i.issue_type === 'task').length,
      epic: issues.filter(i => i.issue_type === 'epic').length,
      bug: issues.filter(i => i.issue_type === 'bug').length,
      feature: issues.filter(i => i.issue_type === 'feature').length,
      chore: issues.filter(i => i.issue_type === 'chore').length,
    };

    // Assignee breakdown
    const assignees = new Map<string, number>();
    for (const issue of issues) {
      const assignee = issue.assignee || 'unassigned';
      assignees.set(assignee, (assignees.get(assignee) || 0) + 1);
    }

    // Labels breakdown
    const labels = new Map<string, number>();
    for (const issue of issues) {
      if (issue.labels) {
        for (const label of issue.labels) {
          labels.set(label, (labels.get(label) || 0) + 1);
        }
      }
    }

    // Completion rate
    const completionRate = issues.length > 0
      ? ((statusCounts.closed / issues.length) * 100).toFixed(1)
      : '0.0';

    // Blocked rate
    const blockedRate = issues.length > 0
      ? ((statusCounts.blocked / issues.length) * 100).toFixed(1)
      : '0.0';

    // Issues with dependencies
    const withDependencies = issues.filter(i =>
      (i.blockedBy && i.blockedBy.length > 0) ||
      (i.blocks && i.blocks.length > 0) ||
      i.parent ||
      (i.children && i.children.length > 0)
    ).length;

    // Top assignees
    const topAssignees = Array.from(assignees.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top labels
    const topLabels = Array.from(labels.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return {
      statusCounts,
      priorityCounts,
      typeCounts,
      assignees,
      labels,
      completionRate,
      blockedRate,
      withDependencies,
      topAssignees,
      topLabels,
    };
  }, [data]);

  // Simple horizontal bar chart
  const renderBar = (count: number, total: number, color: string, width: number = 30) => {
    const filled = Math.round((count / total) * width);
    const empty = width - filled;
    const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

    return (
      <Box>
        <Text color={color}>{'█'.repeat(filled)}</Text>
        <Text dimColor>{'░'.repeat(empty)}</Text>
        <Text dimColor> {count} ({percentage}%)</Text>
      </Box>
    );
  };

  return (
    <Box flexDirection="column" width={terminalWidth}>
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          BD TUI - Statistics & Analytics Dashboard
        </Text>
        <Text dimColor>Total Issues: <Text color="white">{data.stats.total}</Text></Text>
      </Box>

      <Box flexDirection="column" gap={1}>
        {/* Status breakdown */}
        <Box flexDirection="column" borderStyle="single" borderColor="blue" padding={1}>
          <Text bold color="blue">Status Breakdown</Text>
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color="blue" minWidth={12}>Open:</Text>
              {renderBar(stats.statusCounts.open, data.stats.total, 'blue')}
            </Box>
            <Box>
              <Text color="yellow" minWidth={12}>In Progress:</Text>
              {renderBar(stats.statusCounts.in_progress, data.stats.total, 'yellow')}
            </Box>
            <Box>
              <Text color="red" minWidth={12}>Blocked:</Text>
              {renderBar(stats.statusCounts.blocked, data.stats.total, 'red')}
            </Box>
            <Box>
              <Text color="green" minWidth={12}>Closed:</Text>
              {renderBar(stats.statusCounts.closed, data.stats.total, 'green')}
            </Box>
          </Box>
        </Box>

        {/* Key metrics */}
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" padding={1}>
          <Text bold color="magenta">Key Metrics</Text>
          <Box flexDirection="column" marginTop={1} gap={0}>
            <Box>
              <Text>Completion Rate: </Text>
              <Text bold color="green">{stats.completionRate}%</Text>
            </Box>
            <Box>
              <Text>Blocked Rate: </Text>
              <Text bold color="red">{stats.blockedRate}%</Text>
            </Box>
            <Box>
              <Text>Issues with Dependencies: </Text>
              <Text bold color="cyan">{stats.withDependencies}</Text>
            </Box>
          </Box>
        </Box>

        {/* Priority breakdown */}
        <Box flexDirection="column" borderStyle="single" borderColor="yellow" padding={1}>
          <Text bold color="yellow">Priority Distribution</Text>
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text minWidth={12}>P4 (Critical):</Text>
              {renderBar(stats.priorityCounts.p4, data.stats.total, 'red', 25)}
            </Box>
            <Box>
              <Text minWidth={12}>P3 (High):</Text>
              {renderBar(stats.priorityCounts.p3, data.stats.total, 'yellow', 25)}
            </Box>
            <Box>
              <Text minWidth={12}>P2 (Medium):</Text>
              {renderBar(stats.priorityCounts.p2, data.stats.total, 'cyan', 25)}
            </Box>
            <Box>
              <Text minWidth={12}>P1 (Low):</Text>
              {renderBar(stats.priorityCounts.p1, data.stats.total, 'blue', 25)}
            </Box>
            <Box>
              <Text minWidth={12}>P0 (Lowest):</Text>
              {renderBar(stats.priorityCounts.p0, data.stats.total, 'gray', 25)}
            </Box>
          </Box>
        </Box>

        {/* Type breakdown */}
        <Box flexDirection="column" borderStyle="single" borderColor="green" padding={1}>
          <Text bold color="green">Issue Type Distribution</Text>
          <Box flexDirection="column" marginTop={1}>
            <Box>
              <Text color="magenta" minWidth={10}>Epic:</Text>
              {renderBar(stats.typeCounts.epic, data.stats.total, 'magenta', 25)}
            </Box>
            <Box>
              <Text color="green" minWidth={10}>Feature:</Text>
              {renderBar(stats.typeCounts.feature, data.stats.total, 'green', 25)}
            </Box>
            <Box>
              <Text color="red" minWidth={10}>Bug:</Text>
              {renderBar(stats.typeCounts.bug, data.stats.total, 'red', 25)}
            </Box>
            <Box>
              <Text color="blue" minWidth={10}>Task:</Text>
              {renderBar(stats.typeCounts.task, data.stats.total, 'blue', 25)}
            </Box>
            <Box>
              <Text color="gray" minWidth={10}>Chore:</Text>
              {renderBar(stats.typeCounts.chore, data.stats.total, 'gray', 25)}
            </Box>
          </Box>
        </Box>

        {/* Top assignees */}
        <Box flexDirection="column" borderStyle="single" borderColor="cyan" padding={1}>
          <Text bold color="cyan">Top Assignees</Text>
          <Box flexDirection="column" marginTop={1}>
            {stats.topAssignees.length > 0 ? (
              stats.topAssignees.map(([assignee, count]) => (
                <Box key={assignee}>
                  <Text minWidth={20}>{assignee}:</Text>
                  <Text bold color="cyan">{count}</Text>
                  <Text dimColor> issue{count !== 1 ? 's' : ''}</Text>
                </Box>
              ))
            ) : (
              <Text dimColor>No assignees</Text>
            )}
          </Box>
        </Box>

        {/* Top labels */}
        <Box flexDirection="column" borderStyle="single" borderColor="magenta" padding={1}>
          <Text bold color="magenta">Top Labels</Text>
          <Box flexDirection="column" marginTop={1}>
            {stats.topLabels.length > 0 ? (
              stats.topLabels.map(([label, count]) => (
                <Box key={label}>
                  <Text minWidth={20}>{label}:</Text>
                  <Text bold color="magenta">{count}</Text>
                  <Text dimColor> issue{count !== 1 ? 's' : ''}</Text>
                </Box>
              ))
            ) : (
              <Text dimColor>No labels</Text>
            )}
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
        <Text dimColor>
          1 kanban | 2 tree | 3 graph | 4 stats | ? help | q quit
        </Text>
      </Box>
    </Box>
  );
}
