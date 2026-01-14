import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { DetailPanel } from './DetailPanel';
import { Footer } from './Footer';
import type { Issue, BeadsData } from '../types';

interface DependencyGraphProps {
  data: BeadsData;
  terminalWidth: number;
  terminalHeight: number;
}

interface GraphNode {
  issue: Issue;
  level: number;
  column: number;
}

function buildDependencyLevels(data: BeadsData): GraphNode[][] {
  const { byId } = data;
  const levels: GraphNode[][] = [];
  const processed = new Set<string>();
  const inProcess = new Set<string>();

  // Find issues with no dependencies (level 0)
  function getLevel(issue: Issue, visitedPath: Set<string> = new Set()): number {
    if (processed.has(issue.id)) {
      // Already computed
      const found = levels.findIndex(level =>
        level && level.some(node => node.issue.id === issue.id)
      );
      return found >= 0 ? found : 0;
    }

    // Detect cycles
    if (visitedPath.has(issue.id)) {
      return 0;
    }

    visitedPath.add(issue.id);

    let maxDepLevel = 0;

    // Check blocked-by dependencies
    if (issue.blockedBy && issue.blockedBy.length > 0) {
      for (const depId of issue.blockedBy) {
        const dep = byId.get(depId);
        if (dep) {
          const depLevel = getLevel(dep, new Set(visitedPath));
          maxDepLevel = Math.max(maxDepLevel, depLevel + 1);
        }
      }
    }

    return maxDepLevel;
  }

  // Calculate levels for all issues with dependencies
  const issuesWithDeps = data.issues.filter(
    issue =>
      (issue.blockedBy && issue.blockedBy.length > 0) ||
      (issue.blocks && issue.blocks.length > 0) ||
      (issue.parent) ||
      (issue.children && issue.children.length > 0)
  );

  for (const issue of issuesWithDeps) {
    const level = getLevel(issue);
    if (!levels[level]) {
      levels[level] = [];
    }
    levels[level].push({ issue, level, column: levels[level].length });
    processed.add(issue.id);
  }

  return levels;
}

export function DependencyGraph({ data, terminalWidth, terminalHeight }: DependencyGraphProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const toggleEditForm = useBeadsStore(state => state.toggleEditForm);

  const levels = useMemo(() => buildDependencyLevels(data), [data]);
  const flatNodes = useMemo(() => levels.flat(), [levels]);

  const itemsPerPage = Math.max(Math.floor((terminalHeight - 12) / 5), 3);

  useInput((input, key) => {
    // Navigation
    if (key.upArrow || input === 'k') {
      if (selectedIndex > 0) {
        const newIndex = selectedIndex - 1;
        setSelectedIndex(newIndex);

        // Scroll up if needed
        if (newIndex < scrollOffset) {
          setScrollOffset(newIndex);
        }
      }
    }

    if (key.downArrow || input === 'j') {
      if (selectedIndex < flatNodes.length - 1) {
        const newIndex = selectedIndex + 1;
        setSelectedIndex(newIndex);

        // Scroll down if needed
        if (newIndex >= scrollOffset + itemsPerPage) {
          setScrollOffset(newIndex - itemsPerPage + 1);
        }
      }
    }

    // Toggle details
    if (key.return || input === ' ') {
      setShowDetails(!showDetails);
    }

    // Edit selected issue
    if (input === 'e') {
      toggleEditForm();
    }
  });

  if (levels.length === 0) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">BD TUI - Dependency Graph</Text>
        <Box marginTop={1}>
          <Text dimColor>No dependencies to visualize</Text>
        </Box>
        <Box marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text dimColor>1 kanban | 2 tree | 3 graph | ? help | q quit</Text>
        </Box>
      </Box>
    );
  }

  const selectedIssue = flatNodes[selectedIndex]?.issue;
  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + itemsPerPage);

  // Group visible nodes back into levels for rendering
  const visibleLevels = new Map<number, GraphNode[]>();
  for (const node of visibleNodes) {
    if (!visibleLevels.has(node.level)) {
      visibleLevels.set(node.level, []);
    }
    visibleLevels.get(node.level)!.push(node);
  }

  const typeColors: Record<string, string> = {
    epic: 'magenta',
    task: 'blue',
    bug: 'red',
    feature: 'green',
    chore: 'gray',
  };

  const statusColors: Record<string, string> = {
    open: 'blue',
    in_progress: 'yellow',
    blocked: 'red',
    closed: 'green',
  };

  return (
    <Box flexDirection="column" width="100%">
      {/* Header */}
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="cyan">
          BD TUI - Dependency Graph - Interactive
        </Text>
        <Box gap={2}>
          <Text dimColor>
            Issues with dependencies: <Text color="white">{flatNodes.length}</Text>
          </Text>
          <Text dimColor>
            Levels: <Text color="white">{levels.length}</Text>
          </Text>
          <Text dimColor>Selected: <Text color="cyan">{selectedIndex + 1}/{flatNodes.length}</Text></Text>
        </Box>
        <Text dimColor>← Dependencies flow from left to right →</Text>
      </Box>

      <Box>
        {/* Graph visualization */}
        <Box flexDirection="column">
          {Array.from(visibleLevels.entries()).map(([levelIdx, levelNodes]) => {
            const totalInLevel = levels[levelIdx]?.length || 0;

            return (
              <Box key={levelIdx} flexDirection="column" marginBottom={1}>
                {/* Level label */}
                <Box>
                  <Text bold color="yellow">Level {levelIdx}</Text>
                  <Text dimColor> ({totalInLevel} issue{totalInLevel !== 1 ? 's' : ''})</Text>
                </Box>

                {/* Issues in this level */}
                <Box flexDirection="column" marginLeft={2}>
                  {levelNodes.map((node) => {
                    const typeColor = typeColors[node.issue.issue_type] || 'white';
                    const statusColor = statusColors[node.issue.status] || 'white';
                    const globalIndex = flatNodes.findIndex(n => n.issue.id === node.issue.id);
                    const isSelected = globalIndex === selectedIndex;
                    const isLastInVisibleLevel = levelNodes.indexOf(node) === levelNodes.length - 1;

                    return (
                      <Box key={node.issue.id} flexDirection="column" marginBottom={1}>
                        {/* Issue box */}
                        <Box backgroundColor={isSelected ? 'blue' : undefined}>
                          <Text dimColor>
                            {isLastInVisibleLevel ? '└─' : '├─'}
                          </Text>
                          <Text bold color={isSelected ? 'white' : 'white'}>
                            [{node.issue.id}]
                          </Text>
                          <Text color={isSelected ? 'white' : undefined}>
                            {' '}{node.issue.title.substring(0, 40)}
                          </Text>
                          {node.issue.title.length > 40 && <Text>...</Text>}
                        </Box>

                        {/* Metadata */}
                        <Box marginLeft={3}>
                          <Text color={typeColor}>{node.issue.issue_type}</Text>
                          <Text dimColor> | </Text>
                          <Text color={statusColor}>{node.issue.status}</Text>
                          <Text dimColor> | P{node.issue.priority}</Text>
                        </Box>

                        {/* Dependencies */}
                        {node.issue.blockedBy && node.issue.blockedBy.length > 0 && (
                          <Box marginLeft={3}>
                            <Text color="red">← Blocked by: </Text>
                            <Text dimColor>{node.issue.blockedBy.join(', ')}</Text>
                          </Box>
                        )}

                        {node.issue.blocks && node.issue.blocks.length > 0 && (
                          <Box marginLeft={3}>
                            <Text color="yellow">→ Blocks: </Text>
                            <Text dimColor>{node.issue.blocks.join(', ')}</Text>
                          </Box>
                        )}

                        {node.issue.children && node.issue.children.length > 0 && (
                          <Box marginLeft={3}>
                            <Text color="cyan">└→ Children: </Text>
                            <Text dimColor>{node.issue.children.join(', ')}</Text>
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })}

          {/* Scroll indicators */}
          {scrollOffset > 0 && (
            <Text dimColor>↑ More above...</Text>
          )}
          {scrollOffset + itemsPerPage < flatNodes.length && (
            <Text dimColor>↓ More below...</Text>
          )}
        </Box>

        {/* Detail panel */}
        {showDetails && selectedIssue && (
          <Box marginLeft={2}>
            <DetailPanel issue={selectedIssue} />
          </Box>
        )}
      </Box>

      {/* Legend */}
      <Box borderStyle="single" borderColor="gray" paddingX={1} flexDirection="column">
        <Text dimColor>Legend:</Text>
        <Box gap={2}>
          <Text color="red">← Blocked by</Text>
          <Text color="yellow">→ Blocks</Text>
          <Text color="cyan">└→ Children</Text>
        </Box>
      </Box>

      {/* Footer */}
      <Footer currentView="graph" />
    </Box>
  );
}
