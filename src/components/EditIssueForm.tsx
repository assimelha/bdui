import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { updateIssue, type UpdateIssueParams } from '../bd/commands';
import type { Issue } from '../types';

interface EditIssueFormProps {
  issue: Issue;
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'description' | 'priority' | 'status' | 'assignee' | 'labels';

const STATUSES: Array<'open' | 'closed' | 'in_progress' | 'blocked'> = ['open', 'in_progress', 'blocked', 'closed'];

export function EditIssueForm({ issue, onClose, onSuccess }: EditIssueFormProps) {
  const [currentField, setCurrentField] = useState<FormField>('title');
  const [formData, setFormData] = useState({
    title: issue.title,
    description: issue.description || '',
    priority: issue.priority,
    status: issue.status,
    assignee: issue.assignee || '',
    labels: issue.labels?.join(', ') || '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fields: FormField[] = ['title', 'description', 'priority', 'status', 'assignee', 'labels'];
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

    // Navigation for status field
    if (currentField === 'status') {
      const currentIndex = STATUSES.indexOf(formData.status);
      if (key.upArrow && currentIndex > 0) {
        setFormData({ ...formData, status: STATUSES[currentIndex - 1] });
      } else if (key.downArrow && currentIndex < STATUSES.length - 1) {
        setFormData({ ...formData, status: STATUSES[currentIndex + 1] });
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

      const params: UpdateIssueParams = {
        id: issue.id,
      };

      // Only include changed fields
      if (formData.title !== issue.title) {
        params.title = formData.title;
      }
      if (formData.description !== (issue.description || '')) {
        params.description = formData.description;
      }
      if (formData.priority !== issue.priority) {
        params.priority = formData.priority;
      }
      if (formData.status !== issue.status) {
        params.status = formData.status;
      }
      if (formData.assignee !== (issue.assignee || '')) {
        params.assignee = formData.assignee || undefined;
      }

      const currentLabels = issue.labels?.join(', ') || '';
      if (formData.labels !== currentLabels) {
        params.labels = labels;
      }

      await updateIssue(params);

      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue');
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="yellow"
      padding={1}
      width={80}
    >
      <Text bold color="yellow">
        Edit Issue: {issue.id}
      </Text>
      <Text dimColor>
        ESC to cancel | Tab/Shift+Tab to navigate | Enter to submit
      </Text>

      <Box flexDirection="column" marginTop={1}>
        {/* Title */}
        <Box marginBottom={1}>
          <Text color={currentField === 'title' ? 'yellow' : 'gray'} bold={currentField === 'title'}>
            Title:
          </Text>
          <Text>{formData.title}</Text>
          {currentField === 'title' && <Text dimColor>█</Text>}
        </Box>

        {/* Description */}
        <Box marginBottom={1}>
          <Text color={currentField === 'description' ? 'yellow' : 'gray'} bold={currentField === 'description'}>
            Description:
          </Text>
          <Text>{formData.description || <Text dimColor>(empty)</Text>}</Text>
          {currentField === 'description' && <Text dimColor>█</Text>}
        </Box>

        {/* Priority */}
        <Box marginBottom={1}>
          <Text color={currentField === 'priority' ? 'yellow' : 'gray'} bold={currentField === 'priority'}>
            Priority:
          </Text>
          <Text>
            P{formData.priority} {getPriorityLabel(formData.priority)}
          </Text>
          {currentField === 'priority' && <Text dimColor> (use ↑/↓)</Text>}
        </Box>

        {/* Status */}
        <Box marginBottom={1}>
          <Text color={currentField === 'status' ? 'yellow' : 'gray'} bold={currentField === 'status'}>
            Status:
          </Text>
          <Text>{formData.status}</Text>
          {currentField === 'status' && <Text dimColor> (use ↑/↓)</Text>}
        </Box>

        {/* Assignee */}
        <Box marginBottom={1}>
          <Text color={currentField === 'assignee' ? 'yellow' : 'gray'} bold={currentField === 'assignee'}>
            Assignee:
          </Text>
          <Text>{formData.assignee || <Text dimColor>(none)</Text>}</Text>
          {currentField === 'assignee' && <Text dimColor>█</Text>}
        </Box>

        {/* Labels */}
        <Box marginBottom={1}>
          <Text color={currentField === 'labels' ? 'yellow' : 'gray'} bold={currentField === 'labels'}>
            Labels:
          </Text>
          <Text>{formData.labels || <Text dimColor>(none)</Text>}</Text>
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
          <Text color="yellow">Updating issue...</Text>
        </Box>
      )}
    </Box>
  );
}

function getPriorityLabel(priority: number): string {
  const labels = ['Lowest', 'Low', 'Medium', 'High', 'Critical'];
  return labels[priority] || 'Unknown';
}
