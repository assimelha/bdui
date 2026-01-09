import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import {
  PRIORITY_LABELS,
  getPriorityColor,
  getTypeColor,
  truncateText,
  LAYOUT,
} from '../utils/constants';

interface IssueCardProps {
  issue: Issue;
  isSelected?: boolean;
}

export function IssueCard({ issue, isSelected = false }: IssueCardProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const priorityColor = getPriorityColor(issue.priority, theme);
  const typeColor = getTypeColor(issue.issue_type, theme);
  const priorityLabel = PRIORITY_LABELS[issue.priority] || 'Unknown';

  return (
    <Box
      borderStyle="round"
      borderColor={isSelected ? theme.colors.primary : theme.colors.border}
      paddingX={1}
      flexDirection="column"
      width={LAYOUT.columnWidth - 2}
      flexGrow={0}
      flexShrink={0}
    >
      <Box flexDirection="column" flexGrow={0} flexShrink={0}>
        <Box width={LAYOUT.columnWidth - 4}>
          <Text bold color={isSelected ? theme.colors.primary : theme.colors.text} wrap="wrap">
            {truncateText(issue.title, LAYOUT.titleMaxLength)}
          </Text>
        </Box>
        <Box width={LAYOUT.columnWidth - 4}>
          <Text color={theme.colors.textDim}>{issue.id}</Text>
        </Box>
      </Box>

      <Box gap={1}>
        <Text color={typeColor}>{issue.issue_type}</Text>
        <Text color={theme.colors.textDim}>|</Text>
        <Text color={priorityColor}>P{issue.priority}</Text>
        <Text color={theme.colors.textDim}>({priorityLabel.toLowerCase()})</Text>
      </Box>

      {issue.assignee && (
        <Box gap={1}>
          <Text color={theme.colors.textDim}>@</Text>
          <Text color={theme.colors.success}>{issue.assignee}</Text>
        </Box>
      )}

      {issue.labels && issue.labels.length > 0 && (
        <Box gap={1}>
          <Text color={theme.colors.textDim}>#</Text>
          <Text color={theme.colors.secondary}>{issue.labels.slice(0, 2).join(', ')}</Text>
          {issue.labels.length > 2 && (
            <Text color={theme.colors.textDim}>+{issue.labels.length - 2}</Text>
          )}
        </Box>
      )}

      {issue.blockedBy && issue.blockedBy.length > 0 && (
        <Box>
          <Text color={theme.colors.statusBlocked}>
            [!] Blocked by {issue.blockedBy.length}
          </Text>
        </Box>
      )}

      {issue.children && issue.children.length > 0 && (
        <Box>
          <Text color={theme.colors.textDim}>
            {issue.children.length} subtask{issue.children.length > 1 ? 's' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}
