import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import {
  PRIORITY_LABELS,
  getPriorityColor,
  getTypeColor,
  getStatusColor,
  truncateText,
  LAYOUT,
} from '../utils/constants';

interface DetailPanelProps {
  issue: Issue | null;
  maxHeight?: number;
}

export function DetailPanel({ issue, maxHeight }: DetailPanelProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  // Calculate description length based on available height
  // Rough estimate: each line is ~50 chars, subtract ~20 lines for other content
  const availableLines = maxHeight ? Math.max(2, maxHeight - 22) : 8;
  const descriptionMaxLength = Math.min(LAYOUT.descriptionMaxLength, availableLines * 50);

  if (!issue) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor={theme.colors.border}
        padding={1}
        minWidth={50}
      >
        <Text color={theme.colors.textDim} italic>No issue selected</Text>
        <Box marginTop={1}>
          <Text color={theme.colors.textDim}>
            Select an issue with arrow keys
          </Text>
        </Box>
      </Box>
    );
  }

  const priorityLabel = PRIORITY_LABELS[issue.priority] || 'Unknown';
  const priorityColor = getPriorityColor(issue.priority, theme);
  const typeColor = getTypeColor(issue.issue_type, theme);
  const statusColor = getStatusColor(issue.status, theme);

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.colors.primary}
      padding={1}
      minWidth={50}
      flexGrow={1}
      height={maxHeight}
      overflow="hidden"
    >
      {/* Header */}
      <Box flexDirection="column" marginBottom={1} flexGrow={0} flexShrink={0}>
        <Box width={LAYOUT.detailPanelWidth - 4}>
          <Text bold color={theme.colors.primary} wrap="wrap">{issue.title}</Text>
        </Box>
        <Box width={LAYOUT.detailPanelWidth - 4}>
          <Text color={theme.colors.textDim}>{issue.id}</Text>
        </Box>
      </Box>

      {/* Metadata */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Box gap={2}>
          <Text color={theme.colors.textDim}>Type:</Text>
          <Text color={typeColor}>
            {issue.issue_type}
          </Text>
        </Box>

        <Box gap={2}>
          <Text color={theme.colors.textDim}>Priority:</Text>
          <Text color={priorityColor}>
            {priorityLabel} (P{issue.priority})
          </Text>
        </Box>

        <Box gap={2}>
          <Text color={theme.colors.textDim}>Status:</Text>
          <Text color={statusColor}>
            {issue.status.replace('_', ' ')}
          </Text>
        </Box>

        {issue.assignee && (
          <Box gap={2}>
            <Text color={theme.colors.textDim}>Assignee:</Text>
            <Text color={theme.colors.success}>@{issue.assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.textDim}>Labels:</Text>
          <Box gap={1} flexWrap="wrap">
            {issue.labels.map(label => (
              <Text key={label} color={theme.colors.secondary}>#{label}</Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Dependencies */}
      {issue.blockedBy && issue.blockedBy.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.statusBlocked} bold>[!] Blocked by:</Text>
          {issue.blockedBy.map(id => (
            <Text key={id} color={theme.colors.textDim}>  - {id}</Text>
          ))}
        </Box>
      )}

      {issue.blocks && issue.blocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.textDim}>Blocks:</Text>
          {issue.blocks.map(id => (
            <Text key={id} color={theme.colors.textDim}>  - {id}</Text>
          ))}
        </Box>
      )}

      {issue.parent && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.textDim}>Parent:</Text>
          <Text color={theme.colors.textDim}>  - {issue.parent}</Text>
        </Box>
      )}

      {issue.children && issue.children.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color={theme.colors.textDim}>Subtasks ({issue.children.length}):</Text>
          {issue.children.slice(0, 5).map(id => (
            <Text key={id} color={theme.colors.textDim}>  - {id}</Text>
          ))}
          {issue.children.length > 5 && (
            <Text color={theme.colors.textDim}>  ... and {issue.children.length - 5} more</Text>
          )}
        </Box>
      )}

      {/* Description */}
      {issue.description && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor={theme.colors.border} padding={1}>
          <Text bold color={theme.colors.textDim}>Description:</Text>
          <Text color={theme.colors.text}>
            {truncateText(issue.description, descriptionMaxLength, true)}
          </Text>
        </Box>
      )}

      {/* Timestamps */}
      <Box flexDirection="column" marginTop={1} paddingTop={1} borderColor={theme.colors.border} borderTop>
        <Text color={theme.colors.textDim}>Created: {new Date(issue.created_at).toLocaleString()}</Text>
        <Text color={theme.colors.textDim}>Updated: {new Date(issue.updated_at).toLocaleString()}</Text>
        {issue.closed_at && (
          <Text color={theme.colors.textDim}>Closed: {new Date(issue.closed_at).toLocaleString()}</Text>
        )}
      </Box>

      {/* Actions hint */}
      <Box marginTop={1}>
        <Text color={theme.colors.textDim}>
          e edit | x export | ESC close
        </Text>
      </Box>
    </Box>
  );
}
