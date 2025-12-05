import notifier from 'node-notifier';
import { join } from 'path';
import { existsSync } from 'fs';
import type { Issue } from '../types';

/**
 * Get the path to the project root (handles both dev and compiled binary)
 */
function getProjectRoot(): string {
  // In development, __dirname is in src/utils
  // In compiled binary, assets are bundled or we use a fallback
  const devPath = join(__dirname, '..', '..', 'assets', 'icons');
  const prodPath = join(process.cwd(), 'assets', 'icons');

  if (existsSync(devPath)) {
    return devPath;
  } else if (existsSync(prodPath)) {
    return prodPath;
  }

  // Fallback: no custom icons
  return '';
}

/**
 * Get icon path for a notification type
 */
function getIconPath(type: 'completed' | 'blocked'): string | undefined {
  const iconsDir = getProjectRoot();
  if (!iconsDir) return undefined;

  const iconPath = join(iconsDir, `${type}.png`);
  return existsSync(iconPath) ? iconPath : undefined;
}

/**
 * Play a system bell sound
 */
export function playCompletionSound() {
  // Terminal bell - works in most terminals
  process.stdout.write('\x07');
}

/**
 * Show native notification for completed task
 */
export function showCompletionNotification(issue: Issue) {
  const icon = getIconPath('completed');

  notifier.notify({
    title: '✅ Task Completed!',
    message: issue.title,
    
    wait: false,
    icon, // Cross-platform icon support
  });
}

/**
 * Show native notification for newly blocked task
 */
export function showBlockedNotification(issue: Issue, blockedBy: string[]) {
  const icon = getIconPath('blocked');

  notifier.notify({
    title: '🚫 Task Blocked',
    message: issue.title,
    
    wait: false,
    icon, // Cross-platform icon support
  });
}

/**
 * Compare two issue states and detect status changes
 */
export interface StatusChange {
  issue: Issue;
  oldStatus: string;
  newStatus: string;
}

export function detectStatusChanges(
  oldIssues: Map<string, Issue>,
  newIssues: Map<string, Issue>
): StatusChange[] {
  const changes: StatusChange[] = [];

  for (const [id, newIssue] of newIssues) {
    const oldIssue = oldIssues.get(id);

    if (oldIssue && oldIssue.status !== newIssue.status) {
      changes.push({
        issue: newIssue,
        oldStatus: oldIssue.status,
        newStatus: newIssue.status,
      });
    }
  }

  return changes;
}

/**
 * Handle task completion notifications
 */
export function notifyStatusChange(change: StatusChange) {
  const { issue, oldStatus, newStatus } = change;

  // Task completed
  if (newStatus === 'closed' && oldStatus !== 'closed') {
    playCompletionSound();
    showCompletionNotification(issue);
  }

  // Task became blocked
  if (newStatus === 'blocked' && oldStatus !== 'blocked') {
    if (issue.blockedBy && issue.blockedBy.length > 0) {
      showBlockedNotification(issue, issue.blockedBy);
    }
  }
}
