import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { IssueCard } from './IssueCard';

interface StatusColumnProps {
  title: string;
  issues: Issue[];
  isActive: boolean;
  selectedIndex: number;
  scrollOffset: number;
  itemsPerPage: number;
  color?: string;
}

export function StatusColumn({
  title,
  issues,
  isActive,
  selectedIndex,
  scrollOffset,
  itemsPerPage,
  color = 'white'
}: StatusColumnProps) {
  const totalIssues = issues.length;
  const visibleIssues = issues.slice(scrollOffset, scrollOffset + itemsPerPage);
  const hasMore = totalIssues > scrollOffset + itemsPerPage;
  const hasLess = scrollOffset > 0;

  return (
    <Box flexDirection="column" paddingX={1} minWidth={37}>
      {/* Header */}
      <Box
        borderStyle={isActive ? 'double' : 'single'}
        borderColor={isActive ? 'cyan' : color}
        paddingX={1}
        justifyContent="center"
      >
        <Text bold color={isActive ? 'cyan' : color}>
          {title} ({totalIssues})
        </Text>
      </Box>

      {/* Scroll up indicator */}
      {hasLess && (
        <Box justifyContent="center">
          <Text color="yellow">▲ ▲ ▲</Text>
        </Box>
      )}

      {/* Issues list - compact */}
      <Box flexDirection="column" gap={1}>
        {totalIssues === 0 ? (
          <Box paddingX={1}>
            <Text dimColor italic>No issues</Text>
          </Box>
        ) : (
          visibleIssues.map((issue, idx) => {
            const absoluteIndex = scrollOffset + idx;
            const isSelected = isActive && absoluteIndex === selectedIndex;
            return (
              <IssueCard
                key={issue.id}
                issue={issue}
                isSelected={isSelected}
              />
            );
          })
        )}
      </Box>

      {/* Scroll down indicator */}
      {hasMore && (
        <Box justifyContent="center">
          <Text color="yellow">▼ ▼ ▼</Text>
        </Box>
      )}

      {/* Pagination info - compact */}
      {totalIssues > itemsPerPage && (
        <Box justifyContent="center">
          <Text dimColor>
            {scrollOffset + 1}-{Math.min(scrollOffset + itemsPerPage, totalIssues)} of {totalIssues}
          </Text>
        </Box>
      )}
    </Box>
  );
}
