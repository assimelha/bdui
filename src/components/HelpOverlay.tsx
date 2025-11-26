import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function HelpOverlay() {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

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
        borderColor={theme.colors.primary}
        padding={2}
        backgroundColor="black"
      >
        <Box marginBottom={1}>
          <Text bold color={theme.colors.primary}>BD TUI - Keyboard Shortcuts</Text>
        </Box>

        <Box flexDirection="column" gap={0}>
          <Text bold color={theme.colors.warning}>Navigation:</Text>
          <Text>  <Text color={theme.colors.primary}>left/right / h/l</Text>  Move between columns</Text>
          <Text>  <Text color={theme.colors.primary}>up/down / k/j</Text>    Move up/down in column</Text>
          <Text>  <Text color={theme.colors.primary}>0</Text>               Jump to first issue</Text>
          <Text>  <Text color={theme.colors.primary}>$ or G</Text>          Jump to last issue</Text>
          <Text>  <Text color={theme.colors.primary}>: or g</Text>          Open command bar</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Views:</Text>
          <Text>  <Text color={theme.colors.primary}>1</Text>              Kanban board view</Text>
          <Text>  <Text color={theme.colors.primary}>2</Text>              Tree view (hierarchical)</Text>
          <Text>  <Text color={theme.colors.primary}>3</Text>              Dependency graph (ASCII art)</Text>
          <Text>  <Text color={theme.colors.primary}>4</Text>              Statistics & analytics dashboard</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Search & Filter:</Text>
          <Text>  <Text color={theme.colors.primary}>/</Text>              Open search</Text>
          <Text>  <Text color={theme.colors.primary}>f</Text>              Open filter panel</Text>
          <Text>  <Text color={theme.colors.primary}>c</Text>              Clear all filters and search</Text>
          <Text color={theme.colors.textDim}>  (Filters apply across all views including Stats)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Actions:</Text>
          <Text>  <Text color={theme.colors.primary}>N</Text>              Create new issue (Shift+N)</Text>
          <Text>  <Text color={theme.colors.primary}>e</Text>              Edit selected issue</Text>
          <Text>  <Text color={theme.colors.primary}>x</Text>              Export/copy selected issue</Text>
          <Text>  <Text color={theme.colors.primary}>Enter / Space</Text>  Toggle detail panel</Text>
          <Text>  <Text color={theme.colors.primary}>r</Text>              Refresh data</Text>
          <Text>  <Text color={theme.colors.primary}>u</Text>              Undo (view history)</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1}>
          <Text bold color={theme.colors.warning}>Other:</Text>
          <Text>  <Text color={theme.colors.primary}>t</Text>              Change theme / color scheme</Text>
          <Text>  <Text color={theme.colors.primary}>n</Text>              Toggle notifications (sound + native)</Text>
          <Text>  <Text color={theme.colors.primary}>?</Text>              Toggle this help</Text>
          <Text>  <Text color={theme.colors.primary}>q / Ctrl+C</Text>     Quit</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor={theme.colors.border} paddingTop={1}>
          <Text bold color={theme.colors.warning}>Command Bar (: or g):</Text>
          <Text>  <Text color={theme.colors.primary}>:5</Text>              Jump to page 5</Text>
          <Text>  <Text color={theme.colors.primary}>:issue-id</Text>       Jump to issue by ID</Text>
          <Text>  <Text color={theme.colors.primary}>:s o/i/b/c</Text>      Set status</Text>
          <Text>  <Text color={theme.colors.primary}>:p 0-4</Text>          Set priority</Text>
          <Text>  <Text color={theme.colors.primary}>:kanban/tree/graph/stats</Text>  Switch view</Text>
          <Text>  <Text color={theme.colors.primary}>:theme name</Text>     Change theme</Text>
          <Text>  <Text color={theme.colors.primary}>:new :edit :q</Text>   Create, edit, quit</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor={theme.colors.border} paddingTop={1}>
          <Text bold color={theme.colors.warning}>Forms:</Text>
          <Text color={theme.colors.textDim}>  Tab / Shift+Tab   Navigate between fields</Text>
          <Text color={theme.colors.textDim}>  up/down           Change priority/status/type</Text>
          <Text color={theme.colors.textDim}>  Enter             Submit (with confirmation)</Text>
          <Text color={theme.colors.textDim}>  ESC               Cancel and return</Text>
        </Box>

        <Box flexDirection="column" gap={0} marginTop={1} borderTop borderColor={theme.colors.border} paddingTop={1}>
          <Text color={theme.colors.textDim}>Notifications alert you when:</Text>
          <Text color={theme.colors.textDim}>  - Tasks are completed (status changes to closed)</Text>
          <Text color={theme.colors.textDim}>  - Tasks become blocked</Text>
        </Box>

        <Box marginTop={2} justifyContent="center">
          <Text color={theme.colors.textDim}>Press ? to close</Text>
        </Box>
      </Box>
    </Box>
  );
}
