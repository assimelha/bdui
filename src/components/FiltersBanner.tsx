import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { hasActiveFilters, countActiveFilters } from '../utils/constants';

export function FiltersBanner() {
  const filter = useBeadsStore(state => state.filter);
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const data = useBeadsStore(state => state.data);
  const theme = getTheme(currentTheme);

  if (!hasActiveFilters(filter, searchQuery)) return null;

  const filterCount = countActiveFilters(filter, searchQuery);
  const filteredCount = getFilteredIssues().length;
  const totalCount = data.issues.length;

  const filterDescriptions: string[] = [];
  if (searchQuery.trim()) {
    filterDescriptions.push(`search: "${searchQuery.trim().substring(0, 15)}${searchQuery.trim().length > 15 ? '...' : ''}"`);
  }
  if (filter.assignee) {
    filterDescriptions.push(`assignee: ${filter.assignee}`);
  }
  if (filter.status) {
    filterDescriptions.push(`status: ${filter.status}`);
  }
  if (filter.priority !== undefined) {
    filterDescriptions.push(`priority: P${filter.priority}`);
  }
  if (filter.tags && filter.tags.length > 0) {
    filterDescriptions.push(`tags: ${filter.tags.slice(0, 2).join(', ')}${filter.tags.length > 2 ? '...' : ''}`);
  }

  return (
    <Box
      paddingX={1}
      marginBottom={1}
      borderStyle="single"
      borderColor={theme.colors.warning}
    >
      <Box gap={2}>
        <Text color={theme.colors.warning} bold>
          [{filterCount} filter{filterCount !== 1 ? 's' : ''} active]
        </Text>
        <Text color={theme.colors.textDim}>
          {filterDescriptions.join(' | ')}
        </Text>
        <Text>
          <Text color={theme.colors.text}>{filteredCount}</Text>
          <Text color={theme.colors.textDim}>/{totalCount} issues</Text>
        </Text>
        <Text dimColor>
          (c to clear)
        </Text>
      </Box>
    </Box>
  );
}
