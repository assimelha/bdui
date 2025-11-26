import React from 'react';
import { Box, Text } from 'ink';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';

export function Toast() {
  const toastMessage = useBeadsStore(state => state.toastMessage);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const theme = getTheme(currentTheme);

  if (!toastMessage) return null;

  const colorMap = {
    success: theme.colors.success,
    error: theme.colors.error,
    info: theme.colors.primary,
  };

  const iconMap = {
    success: '[OK]',
    error: '[!]',
    info: '[i]',
  };

  const color = colorMap[toastMessage.type];
  const icon = iconMap[toastMessage.type];

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      justifyContent="center"
      paddingX={1}
    >
      <Box
        borderStyle="round"
        borderColor={color}
        paddingX={2}
        paddingY={0}
      >
        <Text color={color} bold>
          {icon} {toastMessage.message}
        </Text>
      </Box>
    </Box>
  );
}
