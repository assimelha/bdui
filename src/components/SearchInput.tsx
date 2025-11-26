import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function SearchInput() {
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const setSearchQuery = useBeadsStore(state => state.setSearchQuery);
  const toggleSearch = useBeadsStore(state => state.toggleSearch);
  const getFilteredIssues = useBeadsStore(state => state.getFilteredIssues);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  const filteredCount = getFilteredIssues().length;

  useInput((input, key) => {
    // Close search with Escape
    if (key.escape) {
      toggleSearch();
      return;
    }

    // Handle backspace
    if (key.backspace || key.delete) {
      setSearchQuery(searchQuery.slice(0, -1));
      return;
    }

    // Handle regular input
    if (!key.ctrl && !key.meta && input) {
      setSearchQuery(searchQuery + input);
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="single"
      borderColor={theme.colors.primary}
      paddingX={1}
      marginBottom={1}
    >
      <Box gap={2}>
        <Box>
          <Text bold color={theme.colors.primary}>Search: </Text>
          <Text color={theme.colors.text}>{searchQuery}</Text>
          <Text color={theme.colors.textDim}>|</Text>
        </Box>
        {searchQuery.trim() && (
          <Text color={theme.colors.textDim}>
            ({filteredCount} result{filteredCount !== 1 ? 's' : ''})
          </Text>
        )}
      </Box>
      <Text color={theme.colors.textDim}>
        Type to search in title, description, ID | ESC to close
      </Text>
    </Box>
  );
}
