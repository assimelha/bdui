import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface CreateIssueParams {
  title: string;
  description?: string;
  priority?: number;
  issueType?: 'task' | 'epic' | 'bug' | 'feature' | 'chore';
  assignee?: string;
  labels?: string[];
  parent?: string;
}

export interface UpdateIssueParams {
  id: string;
  title?: string;
  description?: string;
  priority?: number;
  status?: 'open' | 'closed' | 'in_progress' | 'blocked';
  assignee?: string;
  labels?: string[];
}

/**
 * Create a new issue using bd CLI
 */
export async function createIssue(params: CreateIssueParams): Promise<string> {
  const args: string[] = ['bd', 'new'];

  // Add title
  args.push(params.title);

  // Add description if provided
  if (params.description) {
    args.push('-d', params.description);
  }

  // Add priority if provided
  if (params.priority !== undefined) {
    args.push('-p', params.priority.toString());
  }

  // Add issue type if provided
  if (params.issueType) {
    args.push('-t', params.issueType);
  }

  // Add assignee if provided
  if (params.assignee) {
    args.push('-a', params.assignee);
  }

  // Add labels if provided
  if (params.labels && params.labels.length > 0) {
    args.push('-l', params.labels.join(','));
  }

  // Add parent if provided
  if (params.parent) {
    args.push('--parent', params.parent);
  }

  try {
    const { stdout } = await execAsync(args.join(' '));
    return stdout.trim();
  } catch (error) {
    throw new Error(`Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update an existing issue using bd CLI
 */
export async function updateIssue(params: UpdateIssueParams): Promise<void> {
  const args: string[] = ['bd', 'edit', params.id];

  // Add title if provided
  if (params.title) {
    args.push('-t', params.title);
  }

  // Add description if provided
  if (params.description !== undefined) {
    args.push('-d', params.description);
  }

  // Add priority if provided
  if (params.priority !== undefined) {
    args.push('-p', params.priority.toString());
  }

  // Add status if provided
  if (params.status) {
    args.push('-s', params.status);
  }

  // Add assignee if provided
  if (params.assignee !== undefined) {
    args.push('-a', params.assignee || '');
  }

  // Add labels if provided
  if (params.labels) {
    args.push('-l', params.labels.join(','));
  }

  try {
    await execAsync(args.join(' '));
  } catch (error) {
    throw new Error(`Failed to update issue: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get available assignees from the database
 */
export async function getAssignees(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('bd list --format json');
    const issues = JSON.parse(stdout);
    const assignees = new Set<string>();

    for (const issue of issues) {
      if (issue.assignee) {
        assignees.add(issue.assignee);
      }
    }

    return Array.from(assignees).sort();
  } catch {
    return [];
  }
}

/**
 * Get available labels from the database
 */
export async function getLabels(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('bd list --format json');
    const issues = JSON.parse(stdout);
    const labels = new Set<string>();

    for (const issue of issues) {
      if (issue.labels) {
        for (const label of issue.labels) {
          labels.add(label);
        }
      }
    }

    return Array.from(labels).sort();
  } catch {
    return [];
  }
}
