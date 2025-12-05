import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { useBeadsStore } from '../state/store';
import { DetailPanel } from './DetailPanel';
import { Footer } from './Footer';
import type { Issue, BeadsData } from '../types';

interface TreeNode {
  issue: Issue;
  children: TreeNode[];
  depth: number;
}

interface FlatNode {
  issue: Issue;
  depth: number;
  isLast: boolean;
  prefix: string;
}

interface TreeViewProps {
  data: BeadsData;
  terminalHeight: number;
}

function buildTree(data: BeadsData): TreeNode[] {
  const { byId } = data;
  const roots: TreeNode[] = [];
  const processed = new Set<string>();

  // Find root issues (no parent or parent doesn't exist)
  const rootIssues = data.issues.filter(issue =>
    !issue.parent || !byId.has(issue.parent)
  );

  function buildNode(issue: Issue, depth: number): TreeNode {
    processed.add(issue.id);

    const node: TreeNode = {
      issue,
      children: [],
      depth,
    };

    // Add children
    if (issue.children) {
      for (const childId of issue.children) {
        const child = byId.get(childId);
        if (child && !processed.has(childId)) {
          node.children.push(buildNode(child, depth + 1));
        }
      }
    }

    return node;
  }

  for (const rootIssue of rootIssues) {
    if (!processed.has(rootIssue.id)) {
      roots.push(buildNode(rootIssue, 0));
    }
  }

  return roots;
}

function flattenTree(roots: TreeNode[]): FlatNode[] {
  const flat: FlatNode[] = [];

  function traverse(
    node: TreeNode,
    prefix: string,
    isLast: boolean,
    parentIsLast: boolean[] = []
  ) {
    flat.push({
      issue: node.issue,
      depth: node.depth,
      isLast,
      prefix,
    });

    // Process children
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childIsLast = i === node.children.length - 1;
      const verticalLine = isLast ? '   ' : '│  ';
      const newPrefix = prefix + verticalLine;

      traverse(child, newPrefix, childIsLast, [...parentIsLast, isLast]);
    }
  }

  for (let i = 0; i < roots.length; i++) {
    traverse(roots[i], '', i === roots.length - 1);
  }

  return flat;
}

export function TreeView({ data, terminalHeight }: TreeViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const navigateToEditIssue = useBeadsStore(state => state.navigateToEditIssue);

  const tree = useMemo(() => buildTree(data), [data]);
  const flatNodes = useMemo(() => flattenTree(tree), [tree]);

  const itemsPerPage = Math.max(Math.floor((terminalHeight - 10) / 3), 5);

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
      navigateToEditIssue();
    }
  });

  if (flatNodes.length === 0) {
    return (
      <Box padding={1}>
        <Text dimColor>No issues to display</Text>
      </Box>
    );
  }

  const selectedIssue = flatNodes[selectedIndex]?.issue;
  const visibleNodes = flatNodes.slice(scrollOffset, scrollOffset + itemsPerPage);

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
          BD TUI - Tree View (Hierarchical) - Interactive
        </Text>
        <Box gap={2}>
          <Text dimColor>Total: <Text color="white">{data.stats.total}</Text></Text>
          <Text dimColor>Root Issues: <Text color="white">{tree.length}</Text></Text>
          <Text dimColor>Selected: <Text color="cyan">{selectedIndex + 1}/{flatNodes.length}</Text></Text>
        </Box>
      </Box>

      <Box>
        {/* Tree */}
        <Box flexDirection="column">
          {visibleNodes.map((node, idx) => {
            const globalIndex = scrollOffset + idx;
            const isSelected = globalIndex === selectedIndex;
            const connector = node.isLast ? '└──' : '├──';
            const typeColor = typeColors[node.issue.issue_type] || 'white';
            const statusColor = statusColors[node.issue.status] || 'white';

            return (
              <Box key={node.issue.id} flexDirection="column" marginBottom={1}>
                {/* Current node */}
                <Box backgroundColor={isSelected ? 'blue' : undefined}>
                  <Text dimColor>{node.prefix}{connector} </Text>
                  <Text bold color={isSelected ? 'white' : 'white'}>
                    {node.issue.title.substring(0, 50)}
                    {node.issue.title.length > 50 ? '...' : ''}
                  </Text>
                </Box>
                <Box marginLeft={node.prefix.length + 4}>
                  <Text dimColor>({node.issue.id})</Text>
                  <Text color={typeColor}> [{node.issue.issue_type}]</Text>
                  <Text color={statusColor}> {node.issue.status}</Text>
                  <Text dimColor> P{node.issue.priority}</Text>
                  {node.issue.blockedBy && node.issue.blockedBy.length > 0 && (
                    <Text color="red"> 🚫</Text>
                  )}
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

      {/* Footer */}
      <Footer currentView="tree" />
    </Box>
  );
}
