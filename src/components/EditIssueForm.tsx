import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { updateIssue, type UpdateIssueParams } from '../bd/commands';
import type { Issue } from '../types';
import { useBeadsStore } from '../state/store';
import { getTheme } from '../themes/themes';
import { VALIDATION, validateTitle, PRIORITY_LABELS, STATUS_LABELS } from '../utils/constants';

interface EditIssueFormProps {
  issue: Issue;
  onClose: () => void;
  onSuccess: () => void;
}

type FormField = 'title' | 'status' | 'priority' | 'description' | 'assignee' | 'labels';

const STATUSES: Array<'open' | 'closed' | 'in_progress' | 'blocked'> = ['open', 'in_progress', 'blocked', 'closed'];

export function EditIssueForm({ issue, onClose, onSuccess }: EditIssueFormProps) {
  const terminalWidth = useBeadsStore(state => state.terminalWidth);
  const terminalHeight = useBeadsStore(state => state.terminalHeight);
  const currentTheme = useBeadsStore(state => state.currentTheme);
  const showToast = useBeadsStore(state => state.showToast);
  const showConfirm = useBeadsStore(state => state.showConfirm);
  const showConfirmDialog = useBeadsStore(state => state.showConfirmDialog);
  const addToUndoHistory = useBeadsStore(state => state.addToUndoHistory);
  const theme = getTheme(currentTheme);

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

  // Reordered: title -> status -> priority -> description -> assignee -> labels
  // Status is second because it's often the primary reason for editing
  const fields: FormField[] = ['title', 'status', 'priority', 'description', 'assignee', 'labels'];
  const currentFieldIndex = fields.indexOf(currentField);

  // Real-time validation
  const titleValidation = validateTitle(formData.title);
  const titleCharCount = formData.title.length;

  // Track what changed
  const hasChanges =
    formData.title !== issue.title ||
    formData.status !== issue.status ||
    formData.priority !== issue.priority ||
    formData.description !== (issue.description || '') ||
    formData.assignee !== (issue.assignee || '') ||
    formData.labels !== (issue.labels?.join(', ') || '');

  const changedFields: string[] = [];
  if (formData.title !== issue.title) changedFields.push('title');
  if (formData.status !== issue.status) changedFields.push('status');
  if (formData.priority !== issue.priority) changedFields.push('priority');
  if (formData.description !== (issue.description || '')) changedFields.push('description');
  if (formData.assignee !== (issue.assignee || '')) changedFields.push('assignee');
  if (formData.labels !== (issue.labels?.join(', ') || '')) changedFields.push('labels');

  useInput((input, key) => {
    // Don't handle input when confirm dialog is open
    if (showConfirmDialog) return;

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

    // Enter to submit (with confirmation)
    if (key.return && !isSubmitting) {
      if (!titleValidation.valid) {
        setError(titleValidation.error || 'Invalid title');
        return;
      }
      if (!hasChanges) {
        setError('No changes to save');
        return;
      }
      // Show confirmation dialog with changed fields
      showConfirm(
        'Update Issue',
        `Update ${issue.id}? Changes: ${changedFields.join(', ')}`,
        handleSubmit
      );
      return;
    }

    // Handle input for text fields
    if (currentField === 'title' || currentField === 'description' || currentField === 'assignee' || currentField === 'labels') {
      if (key.backspace || key.delete) {
        setFormData({
          ...formData,
          [currentField]: formData[currentField].slice(0, -1),
        });
        setError(null);
        return;
      }

      if (!key.ctrl && !key.meta && input) {
        const currentValue = formData[currentField];
        const maxLength = currentField === 'title'
          ? VALIDATION.title.maxLength
          : currentField === 'description'
          ? VALIDATION.description.maxLength
          : VALIDATION.assignee.maxLength;

        if (currentValue.length < maxLength) {
          setFormData({
            ...formData,
            [currentField]: currentValue + input,
          });
          setError(null);
        }
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
      // Save to undo history before updating
      addToUndoHistory({
        action: 'edit',
        issueId: issue.id,
        previousData: {
          title: issue.title,
          description: issue.description,
          priority: issue.priority,
          status: issue.status,
          assignee: issue.assignee,
          labels: issue.labels,
        },
      });

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

      showToast(`Issue updated: ${changedFields.join(', ')}`, 'success');
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update issue');
      showToast('Failed to update issue', 'error');
      setIsSubmitting(false);
    }
  };

  const primaryColor = theme.colors.primary;

  // Field changed indicator
  const isFieldChanged = (field: string) => changedFields.includes(field);

  return (
    <Box flexDirection="column" width={terminalWidth} height={terminalHeight}>
      {/* Header */}
      <Box flexDirection="column" marginBottom={1}>
        <Box justifyContent="space-between">
          <Text bold color={primaryColor}>
            Edit Issue: {issue.id}
          </Text>
          <Text dimColor>
            {terminalWidth}x{terminalHeight}
          </Text>
        </Box>
        <Box gap={2}>
          <Text dimColor>
            ESC to cancel | Tab/Shift+Tab to navigate | Enter to submit
          </Text>
          {hasChanges && (
            <Text color={theme.colors.warning}>
              [{changedFields.length} change{changedFields.length !== 1 ? 's' : ''}]
            </Text>
          )}
        </Box>
      </Box>

      {/* Form Content */}
      <Box flexDirection="column" padding={2} borderStyle="single" borderColor={primaryColor}>
        {/* Title - with character count and change indicator */}
        <Box flexDirection="column" marginBottom={2}>
          <Box justifyContent="space-between">
            <Box gap={1}>
              <Text color={currentField === 'title' ? primaryColor : theme.colors.text} bold>
                Title * {currentField === 'title' && <Text color={primaryColor}>(editing)</Text>}
              </Text>
              {isFieldChanged('title') && <Text color={theme.colors.warning}>[modified]</Text>}
            </Box>
            <Text color={titleCharCount > VALIDATION.title.maxLength * 0.9 ? theme.colors.warning : theme.colors.textDim}>
              {titleCharCount}/{VALIDATION.title.maxLength}
            </Text>
          </Box>
          <Box
            borderStyle="single"
            borderColor={
              currentField === 'title'
                ? (titleValidation.valid || formData.title === '' ? primaryColor : theme.colors.error)
                : isFieldChanged('title')
                ? theme.colors.warning
                : theme.colors.border
            }
            paddingX={1}
          >
            <Text>{formData.title}</Text>
            {currentField === 'title' && <Text color={theme.colors.textDim}>|</Text>}
          </Box>
          {currentField === 'title' && !titleValidation.valid && formData.title !== '' && (
            <Text color={theme.colors.error}>{titleValidation.error}</Text>
          )}
        </Box>

        {/* Status, Priority in a row - Status first since it's often the primary edit */}
        <Box gap={4} marginBottom={2}>
          {/* Status */}
          <Box flexDirection="column" width="50%">
            <Box gap={1}>
              <Text color={currentField === 'status' ? primaryColor : theme.colors.text} bold>
                Status {currentField === 'status' && <Text color={primaryColor}>(use up/down)</Text>}
              </Text>
              {isFieldChanged('status') && <Text color={theme.colors.warning}>[modified]</Text>}
            </Box>
            <Box
              borderStyle="single"
              borderColor={
                currentField === 'status'
                  ? primaryColor
                  : isFieldChanged('status')
                  ? theme.colors.warning
                  : theme.colors.border
              }
              paddingX={1}
            >
              <Text color={theme.colors.text}>
                {STATUS_LABELS[formData.status] || formData.status}
              </Text>
            </Box>
          </Box>

          {/* Priority */}
          <Box flexDirection="column" width="50%">
            <Box gap={1}>
              <Text color={currentField === 'priority' ? primaryColor : theme.colors.text} bold>
                Priority {currentField === 'priority' && <Text color={primaryColor}>(use up/down)</Text>}
              </Text>
              {isFieldChanged('priority') && <Text color={theme.colors.warning}>[modified]</Text>}
            </Box>
            <Box
              borderStyle="single"
              borderColor={
                currentField === 'priority'
                  ? primaryColor
                  : isFieldChanged('priority')
                  ? theme.colors.warning
                  : theme.colors.border
              }
              paddingX={1}
            >
              <Text color={theme.colors.text}>
                P{formData.priority} - {PRIORITY_LABELS[formData.priority]}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* Issue Type (read-only) */}
        <Box flexDirection="column" marginBottom={2} width="50%">
          <Text color={theme.colors.textDim} bold>
            Type <Text color={theme.colors.textDim}>(read-only)</Text>
          </Text>
          <Box borderStyle="single" borderColor={theme.colors.border} paddingX={1}>
            <Text color={theme.colors.textDim}>{issue.issue_type || 'task'}</Text>
          </Box>
        </Box>

        {/* Description */}
        <Box flexDirection="column" marginBottom={2}>
          <Box justifyContent="space-between">
            <Box gap={1}>
              <Text color={currentField === 'description' ? primaryColor : theme.colors.text} bold>
                Description {currentField === 'description' && <Text color={primaryColor}>(editing)</Text>}
              </Text>
              {isFieldChanged('description') && <Text color={theme.colors.warning}>[modified]</Text>}
            </Box>
            <Text color={theme.colors.textDim}>
              {formData.description.length}/{VALIDATION.description.maxLength}
            </Text>
          </Box>
          <Box
            borderStyle="single"
            borderColor={
              currentField === 'description'
                ? primaryColor
                : isFieldChanged('description')
                ? theme.colors.warning
                : theme.colors.border
            }
            paddingX={1}
          >
            <Text>{formData.description || <Text color={theme.colors.textDim}>(no description)</Text>}</Text>
            {currentField === 'description' && <Text color={theme.colors.textDim}>|</Text>}
          </Box>
        </Box>

        {/* Assignee */}
        <Box flexDirection="column" marginBottom={2}>
          <Box gap={1}>
            <Text color={currentField === 'assignee' ? primaryColor : theme.colors.text} bold>
              Assignee {currentField === 'assignee' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            {isFieldChanged('assignee') && <Text color={theme.colors.warning}>[modified]</Text>}
          </Box>
          <Box
            borderStyle="single"
            borderColor={
              currentField === 'assignee'
                ? primaryColor
                : isFieldChanged('assignee')
                ? theme.colors.warning
                : theme.colors.border
            }
            paddingX={1}
          >
            <Text>{formData.assignee || <Text color={theme.colors.textDim}>(unassigned)</Text>}</Text>
            {currentField === 'assignee' && <Text color={theme.colors.textDim}>|</Text>}
          </Box>
        </Box>

        {/* Labels */}
        <Box flexDirection="column" marginBottom={2}>
          <Box gap={1}>
            <Text color={currentField === 'labels' ? primaryColor : theme.colors.text} bold>
              Labels {currentField === 'labels' && <Text color={primaryColor}>(editing)</Text>}
            </Text>
            {isFieldChanged('labels') && <Text color={theme.colors.warning}>[modified]</Text>}
          </Box>
          <Box
            borderStyle="single"
            borderColor={
              currentField === 'labels'
                ? primaryColor
                : isFieldChanged('labels')
                ? theme.colors.warning
                : theme.colors.border
            }
            paddingX={1}
          >
            <Text>{formData.labels || <Text color={theme.colors.textDim}>(no labels - comma-separated)</Text>}</Text>
            {currentField === 'labels' && <Text color={theme.colors.textDim}>|</Text>}
          </Box>
          {formData.labels && (
            <Text color={theme.colors.textDim}>
              Labels: {formData.labels.split(',').map(l => l.trim()).filter(l => l).join(', ') || '(none)'}
            </Text>
          )}
        </Box>

        {/* Status messages */}
        {error && (
          <Box marginTop={1} borderStyle="single" borderColor={theme.colors.error} paddingX={1}>
            <Text color={theme.colors.error} bold>Error: </Text>
            <Text color={theme.colors.error}>{error}</Text>
          </Box>
        )}

        {isSubmitting && (
          <Box marginTop={1}>
            <Text color={theme.colors.warning}>Updating issue...</Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor={theme.colors.border} paddingX={1}>
        <Box justifyContent="space-between">
          <Text dimColor>
            Tab/Shift+Tab: Navigate | up/down: Change values | Enter: Submit | ESC: Cancel
          </Text>
          <Text color={primaryColor}>
            Field {currentFieldIndex + 1}/{fields.length}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
