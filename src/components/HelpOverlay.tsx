import React from 'react';
import { Box, Text } from 'ink';

export function HelpOverlay() {
  return (
    <Box
      position="absolute"
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        flexDirection="column"
        borderStyle="double"
        borderColor="cyan"
        padding={2}
        backgroundColor="black"
      >
        <Box marginBottom={1}>
          <Text bold color="cyan">BD TUI - Keyboard Shortcuts</Text>
        </Box>

        <Box flexDirection="column" gap={0}>
          <Text bold color="yellow">Navigation:</Text>
          <Text>  ← / h          Move left (previous column)</Text>
          <Text>  → / l          Move right (next column)</Text>
          <Text>  ↑ / k          Move up (previous issue)</Text>
          <Text>  ↓ / j          Move down (next issue)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color="yellow">Views:</Text>
          <Text>  1              Kanban board view</Text>
          <Text>  2              Tree view (hierarchical)</Text>
          <Text>  3              Dependency graph (ASCII art)</Text>
          <Text>  4              Statistics & analytics dashboard</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color="yellow">Search & Filter:</Text>
          <Text>  /              Open search (search title, description, ID)</Text>
          <Text>  f              Open filter panel (assignee, tags, priority, status)</Text>
          <Text>  c              Clear all filters and search</Text>
          <Text dimColor>  (Use ESC to close search/filter panels)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color="yellow">Actions:</Text>
          <Text>  N              Create new issue (Shift+N)</Text>
          <Text>  e              Edit selected issue</Text>
          <Text>  x              Export/copy selected issue</Text>
          <Text>  Enter / Space  Toggle detail panel (Kanban only)</Text>
          <Text>  r              Refresh data</Text>
          <Text>  n              Toggle notifications (sound + native)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color="yellow">Other:</Text>
          <Text>  t              Change theme / color scheme</Text>
          <Text>  ?              Toggle this help</Text>
          <Text>  q / Ctrl+C     Quit</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor="gray" paddingTop={1}>
          <Text dimColor>Notifications alert you when:</Text>
          <Text dimColor>  • Tasks are completed (status → closed)</Text>
          <Text dimColor>  • Tasks become blocked</Text>
        </Box>

        <Box marginTop={2} justifyContent="center">
          <Text dimColor>Press ? to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
