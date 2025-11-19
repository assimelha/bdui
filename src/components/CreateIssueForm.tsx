import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { createIssue, type CreateIssueParams } from '../bd/commands';

interface CreateIssueFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'description' | 'priority' | 'type' | 'assignee' | 'labels';

const ISSUE_TYPES: Array<'task' | 'epic' | 'bug' | 'feature' | 'chore'> = ['task', 'epic', 'bug', 'feature', 'chore'];

export function CreateIssueForm({ onClose, onSuccess }: CreateIssueFormProps) {
  const [currentField, setCurrentField] = useState<FormField>('title');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 2,
    issueType: 'task' as 'task' | 'epic' | 'bug' | 'feature' | 'chore',
    assignee: '',
    labels: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: FormField[] = ['title', 'description', 'priority', 'type', 'assignee', 'labels'];
  const currentFieldIndex = fields.indexOf(currentField);

  useInput((input, key) => {
    // ESC to close
    if (key.escape) {
      onClose();
      return;
    }

    // Tab to next field
    if (key.tab && !key.shift) {
      if (currentFieldIndex < fields.length - 1) {
        setCurrentField(fields[currentFieldIndex + 1]);
      }
      return;
    }

    // Shift+Tab to previous field
    if (key.tab && key.shift) {
      if (currentFieldIndex > 0) {
        setCurrentField(fields[currentFieldIndex - 1]);
      }
      return;
    }

    // Enter to submit
    if (key.return && !isSubmitting) {
      handleSubmit();
      return;
    }

    // Handle input for text fields
    if (currentField === 'title' || currentField === 'description' || currentField === 'assignee' || currentField === 'labels') {
      if (key.backspace || key.delete) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField].slice(0, -1),
        });
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField] + input,
        });
      }
      return;
    }

    // Navigation for priority field
    if (currentField === 'priority') {
      if (key.upArrow && formData.priority < 4) {
        setFormData({ ...formData, priority: formData.priority + 1 });
      } else if (key.downArrow && formData.priority > 0) {
        setFormData({ ...formData, priority: formData.priority - 1 });
      }
      return;
    }

    // Navigation for type field
    if (currentField === 'type') {
      const currentIndex = ISSUE_TYPES.indexOf(formData.issueType);
      if (key.upArrow && currentIndex > 0) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex - 1] });
      } else if (key.downArrow && currentIndex < ISSUE_TYPES.length - 1) {
        setFormData({ ...formData, issueType: ISSUE_TYPES[currentIndex + 1] });
      }
      return;
    }
  });

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Parse labels from comma-separated input
      const labels = formData.labels
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      await createIssue({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        priority: formData.priority,
        issueType: formData.issueType,
        assignee: formData.assignee.trim() || undefined,
        labels: labels.length > 0 ? labels : undefined,
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create issue');
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="cyan"
      padding={1}
      width={80}
    >
      <Text bold color="cyan">
        Create New Issue
      </Text>
      <Text dimColor>
        ESC to cancel | Tab/Shift+Tab to navigate | Enter to submit
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {/* Title */}
        <Box marginBottom={1}>
          <Text color={currentField === 'title' ? 'cyan' : 'gray'} bold={currentField === 'title'}>
            Title:
          </Text>
          <Text>{formData.title || <Text dimColor>(empty)</Text>}</Text>
          {currentField === 'title' && <Text dimColor>█</Text>}
        </Box>

        {/* Description */}
        <Box marginBottom={1}>
          <Text color={currentField === 'description' ? 'cyan' : 'gray'} bold={currentField === 'description'}>
            Description:
          </Text>
          <Text>{formData.description || <Text dimColor>(optional)</Text>}</Text>
          {currentField === 'description' && <Text dimColor>█</Text>}
        </Box>

        {/* Priority */}
        <Box marginBottom={1}>
          <Text color={currentField === 'priority' ? 'cyan' : 'gray'} bold={currentField === 'priority'}>
            Priority:
          </Text>
          <Text>
            P{formData.priority} {getPriorityLabel(formData.priority)}
          </Text>
          {currentField === 'priority' && <Text dimColor> (use ↑/↓)</Text>}
        </Box>

        {/* Issue Type */}
        <Box marginBottom={1}>
          <Text color={currentField === 'type' ? 'cyan' : 'gray'} bold={currentField === 'type'}>
            Type:
          </Text>
          <Text>{formData.issueType}</Text>
          {currentField === 'type' && <Text dimColor> (use ↑/↓)</Text>}
        </Box>

        {/* Assignee */}
        <Box marginBottom={1}>
          <Text color={currentField === 'assignee' ? 'cyan' : 'gray'} bold={currentField === 'assignee'}>
            Assignee:
          </Text>
          <Text>{formData.assignee || <Text dimColor>(optional)</Text>}</Text>
          {currentField === 'assignee' && <Text dimColor>█</Text>}
        </Box>

        {/* Labels */}
        <Box marginBottom={1}>
          <Text color={currentField === 'labels' ? 'cyan' : 'gray'} bold={currentField === 'labels'}>
            Labels:
          </Text>
          <Text>{formData.labels || <Text dimColor>(comma-separated, optional)</Text>}</Text>
          {currentField === 'labels' && <Text dimColor>█</Text>}
        </Box>
      </Box>

      {error && (
        <Box marginTop={1}>
          <Text color="red">{error}</Text>
        </Box>
      )}

      {isSubmitting && (
        <Box marginTop={1}>
          <Text color="yellow">Creating issue...</Text>
        </Box>
      )}
    </Box>
  );
}

function getPriorityLabel(priority: number): string {
  const labels = ['Lowest', 'Low', 'Medium', 'High', 'Critical'];
  return labels[priority] || 'Unknown';
}
