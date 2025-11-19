import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme, getThemeNames } from '../themes/themes';

interface ThemeSelectorProps {
  onClose: () => void;
}

export function ThemeSelector({ onClose }: ThemeSelectorProps) {
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const setTheme = useBeadsStore(state => state.setTheme);

  const themeNames = getThemeNames();
  const [selectedIndex, setSelectedIndex] = useState(
    Math.max(0, themeNames.indexOf(currentTheme))
  );

  useInput((input, key) => {
    // ESC to close
    if (key.escape) {
      onClose();
      return;
    }

    // Navigate with up/down or k/j
    if (key.upArrow || input === 'k') {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex(Math.min(themeNames.length - 1, selectedIndex + 1));
      return;
    }

    // Enter to select theme
    if (key.return) {
      setTheme(themeNames[selectedIndex]);
      onClose();
      return;
    }
  });

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      padding={1}
      width={60}
    >
      <Text bold color="magenta">
        Select Theme
      </Text>
      <Text dimColor>
        ESC to cancel | ↑/↓ or k/j to navigate | Enter to select
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {themeNames.map((themeName, index) => {
          const isSelected = index === selectedIndex;
          const isCurrent = themeName === currentTheme;
          const theme = getTheme(themeName);

          return (
            <Box
              key={themeName}
              borderStyle={isSelected ? 'single' : undefined}
              borderColor={isSelected ? 'magenta' : undefined}
              paddingX={1}
              marginBottom={1}
            >
              <Box flexDirection="column" width="100%">
                <Box>
                  <Text bold color={isSelected ? 'magenta' : 'white'}>
                    {isSelected ? '▶ ' : '  '}
                    {theme.name}
                  </Text>
                  {isCurrent && (
                    <Text color="green"> (current)</Text>
                  )}
                </Box>

                {/* Color preview */}
                <Box gap={1} marginTop={0}>
                  <Text color={theme.colors.statusOpen}>■</Text>
                  <Text color={theme.colors.statusInProgress}>■</Text>
                  <Text color={theme.colors.statusBlocked}>■</Text>
                  <Text color={theme.colors.statusClosed}>■</Text>
                  <Text dimColor>|</Text>
                  <Text color={theme.colors.typeEpic}>E</Text>
                  <Text color={theme.colors.typeFeature}>F</Text>
                  <Text color={theme.colors.typeBug}>B</Text>
                  <Text color={theme.colors.typeTask}>T</Text>
                  <Text color={theme.colors.typeChore}>C</Text>
                </Box>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Box marginTop={1} borderTop borderColor="gray" paddingTop={1}>
        <Text dimColor>
          Preview shows: Status colors | Issue type indicators
        </Text>
      </Box>
    </Box>
  );
}
