import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';

interface DetailPanelProps {
  issue: Issue | null;
}

export function DetailPanel({ issue }: DetailPanelProps) {
  if (!issue) {
    return (
      <Box
        flexDirection="column"
        borderStyle="single"
        borderColor="gray"
        padding={1}
        minWidth={50}
      >
        <Text dimColor italic>No issue selected</Text>
      </Box>
    );
  }

  const priorityLabels: Record<number, string> = {
    0: 'Lowest',
    1: 'Low',
    2: 'Medium',
    3: 'High',
    4: 'Critical',
  };

  const typeColors: Record<string, string> = {
    epic: 'magenta',
    task: 'blue',
    bug: 'red',
    feature: 'green',
    chore: 'gray',
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor="cyan"
      padding={1}
      minWidth={50}
      maxWidth={60}
    >
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="cyan">{issue.title}</Text>
        <Text dimColor>{issue.id}</Text>
      </Box>

      {/* Metadata */}
      <Box flexDirection="column" gap={0} marginBottom={1}>
        <Box gap={2}>
          <Text dimColor>Type:</Text>
          <Text color={typeColors[issue.issue_type] || 'white'}>
            {issue.issue_type}
          </Text>
        </Box>

        <Box gap={2}>
          <Text dimColor>Priority:</Text>
          <Text color={issue.priority >= 3 ? 'red' : 'yellow'}>
            {priorityLabels[issue.priority]} (P{issue.priority})
          </Text>
        </Box>

        <Box gap={2}>
          <Text dimColor>Status:</Text>
          <Text color={issue.status === 'closed' ? 'green' : 'white'}>
            {issue.status}
          </Text>
        </Box>

        {issue.assignee && (
          <Box gap={2}>
            <Text dimColor>Assignee:</Text>
            <Text color="green">@{issue.assignee}</Text>
          </Box>
        )}
      </Box>

      {/* Labels */}
      {issue.labels && issue.labels.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Labels:</Text>
          <Box gap={1} flexWrap="wrap">
            {issue.labels.map(label => (
              <Text key={label} color="blue">#{label}</Text>
            ))}
          </Box>
        </Box>
      )}

      {/* Dependencies */}
      {issue.blockedBy && issue.blockedBy.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text color="red" bold>⚠️  Blocked by:</Text>
          {issue.blockedBy.map(id => (
            <Text key={id} dimColor>  • {id}</Text>
          ))}
        </Box>
      )}

      {issue.blocks && issue.blocks.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Blocks:</Text>
          {issue.blocks.map(id => (
            <Text key={id} dimColor>  • {id}</Text>
          ))}
        </Box>
      )}

      {issue.children && issue.children.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text dimColor>Subtasks ({issue.children.length}):</Text>
          {issue.children.slice(0, 5).map(id => (
            <Text key={id} dimColor>  • {id}</Text>
          ))}
          {issue.children.length > 5 && (
            <Text dimColor>  ... and {issue.children.length - 5} more</Text>
          )}
        </Box>
      )}

      {/* Description */}
      {issue.description && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text bold dimColor>Description:</Text>
          <Text>{issue.description.substring(0, 300)}</Text>
          {issue.description.length > 300 && <Text dimColor>...</Text>}
        </Box>
      )}

      {/* Timestamps */}
      <Box flexDirection="column" marginTop={1} paddingTop={1} borderColor="gray" borderTop>
        <Text dimColor>Created: {new Date(issue.created_at).toLocaleString()}</Text>
        <Text dimColor>Updated: {new Date(issue.updated_at).toLocaleString()}</Text>
        {issue.closed_at && (
          <Text dimColor>Closed: {new Date(issue.closed_at).toLocaleString()}</Text>
        )}
      </Box>
    </Box>
  );
}
