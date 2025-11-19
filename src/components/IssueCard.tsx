import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';

interface IssueCardProps {
  issue: Issue;
  isSelected?: boolean;
}

export function IssueCard({ issue, isSelected = false }: IssueCardProps) {
  // Priority 0-4 (0=lowest, 4=highest)
  const priorityColors: Record<number, string> = {
    0: 'gray',
    1: 'blue',
    2: 'yellow',
    3: 'magenta',
    4: 'red',
  };

  const priorityLabels: Record<number, string> = {
    0: 'lowest',
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'critical',
  };

  const typeColors: Record<string, string> = {
    epic: 'magenta',
    task: 'blue',
    bug: 'red',
    feature: 'green',
    chore: 'gray',
  };

  const priorityColor = priorityColors[issue.priority] || 'gray';
  const typeColor = typeColors[issue.issue_type] || 'white';

  return (
    <Box
      borderStyle="round"
      borderColor={isSelected ? 'cyan' : 'gray'}
      paddingX={1}
      flexDirection="column"
      width={35}
    >
      <Box flexDirection="column">
        <Text bold color={isSelected ? 'cyan' : 'white'}>
          {issue.title.substring(0, 32)}
          {issue.title.length > 32 ? '...' : ''}
        </Text>
        <Text dimColor>{issue.id}</Text>
      </Box>

      <Box gap={1}>
        <Text color={typeColor}>{issue.issue_type}</Text>
        <Text dimColor>|</Text>
        <Text color={priorityColor}>P{issue.priority}</Text>
      </Box>

      {issue.assignee && (
        <Box gap={1}>
          <Text dimColor>@</Text>
          <Text color="green">{issue.assignee}</Text>
        </Box>
      )}

      {issue.labels && issue.labels.length > 0 && (
        <Box gap={1}>
          <Text dimColor>#</Text>
          <Text color="blue">{issue.labels.slice(0, 2).join(', ')}</Text>
        </Box>
      )}

      {issue.blockedBy && issue.blockedBy.length > 0 && (
        <Box>
          <Text color="red">Blocked by {issue.blockedBy.length}</Text>
        </Box>
      )}

      {issue.children && issue.children.length > 0 && (
        <Box>
          <Text dimColor>{issue.children.length} subtask{issue.children.length > 1 ? 's' : ''}</Text>
        </Box>
      )}
    </Box>
  );
}
