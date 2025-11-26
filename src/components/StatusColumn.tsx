import React from 'react';
import { Box, Text } from 'ink';
import type { Issue } from '../types';
import { IssueCard } from './IssueCard';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { LAYOUT, getStatusColor } from '../utils/constants';

interface StatusColumnProps {
  title: string;
  issues: Issue[];
  isActive: boolean;
  selectedIndex: number;
  scrollOffset: number;
  itemsPerPage: number;
  statusKey: string;
}

export function StatusColumn({
  title,
  issues,
  isActive,
  selectedIndex,
  scrollOffset,
  itemsPerPage,
  statusKey,
}: StatusColumnProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const totalIssues = issues.length;
  const visibleIssues = issues.slice(scrollOffset, scrollOffset + itemsPerPage);
  const hasMore = totalIssues > scrollOffset + itemsPerPage;
  const hasLess = scrollOffset > 0;
  const itemsBelow = Math.max(0, totalIssues - (scrollOffset + itemsPerPage));
  const itemsAbove = scrollOffset;
  const currentPage = Math.floor(scrollOffset / itemsPerPage) + 1;
  const totalPages = Math.ceil(totalIssues / itemsPerPage) || 1;

  const statusColor = getStatusColor(statusKey, theme);

  return (
    <Box flexDirection="column" paddingX={1} minWidth={LAYOUT.columnWidth}>
      {/* Header */}
      <Box
        borderStyle={isActive ? 'double' : 'single'}
        borderColor={isActive ? theme.colors.primary : statusColor}
        paddingX={1}
        justifyContent="center"
      >
        <Text bold color={isActive ? theme.colors.primary : statusColor}>
          {title} ({totalIssues})
        </Text>
      </Box>

      {/* Scroll up indicator - improved visibility */}
      {hasLess && (
        <Box justifyContent="center" paddingY={0}>
          <Text color={theme.colors.warning} bold>
            [{itemsAbove} above]
          </Text>
        </Box>
      )}

      {/* Issues list */}
      <Box flexDirection="column" gap={1}>
        {totalIssues === 0 ? (
          <Box
            flexDirection="column"
            paddingX={1}
            paddingY={2}
            borderStyle="single"
            borderColor={theme.colors.border}
          >
            <Text color={theme.colors.textDim} italic>
              No {statusKey.replace('_', ' ')} issues
            </Text>
            <Box marginTop={1}>
              <Text color={theme.colors.textDim}>
                {statusKey === 'open' && 'Press N to create one'}
                {statusKey === 'in_progress' && 'Move issues here with e (edit)'}
                {statusKey === 'blocked' && 'Issues blocked by others appear here'}
                {statusKey === 'closed' && 'Completed issues appear here'}
              </Text>
            </Box>
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

      {/* Scroll down indicator - improved visibility */}
      {hasMore && (
        <Box justifyContent="center" paddingY={0}>
          <Text color={theme.colors.warning} bold>
            [{itemsBelow} below]
          </Text>
        </Box>
      )}

      {/* Pagination info - always visible when there are multiple pages */}
      {totalPages > 1 && (
        <Box justifyContent="center" paddingTop={1}>
          <Box
            borderStyle="single"
            borderColor={isActive ? theme.colors.primary : theme.colors.border}
            paddingX={1}
          >
            <Text color={isActive ? theme.colors.primary : theme.colors.textDim}>
              Page {currentPage}/{totalPages}
            </Text>
            {isActive && (
              <Text color={theme.colors.textDim}> (g to jump)</Text>
            )}
          </Box>
        </Box>
      )}

      {/* Single page indicator */}
      {totalPages === 1 && totalIssues > 0 && (
        <Box justifyContent="center" paddingTop={1}>
          <Text color={theme.colors.textDim}>
            {totalIssues} item{totalIssues !== 1 ? 's' : ''}
          </Text>
        </Box>
      )}
    </Box>
  );
}
