import React from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';

export function SearchInput() {
  const searchQuery = useBeadsStore(state => state.searchQuery);
  const setSearchQuery = useBeadsStore(state => state.setSearchQuery);
  const toggleSearch = useBeadsStore(state => state.toggleSearch);

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
      borderColor="cyan"
      paddingX={1}
      marginBottom={1}
    >
      <Box>
        <Text bold color="cyan">Search: </Text>
        <Text>{searchQuery}</Text>
        <Text dimColor>█</Text>
      </Box>
      <Text dimColor fontSize={10}>
        Type to search in title, description, ID • ESC to close
      </Text>
    </Box>
  );
}
