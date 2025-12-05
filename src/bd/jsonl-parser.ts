import { readFileSync } from 'fs';
import { join } from 'path';
import type { Issue, BeadsData } from '../types';

/**
 * Raw JSONL issue structure
 */
type JsonlIssue = {
  id: string;
  title: string;
  description: string;
  design?: string;
  acceptance_criteria?: string;
  notes?: string;
  status: 'open' | 'in_progress' | 'blocked' | 'closed';
  priority: number;
  issue_type: 'bug' | 'feature' | 'task' | 'epic' | 'chore';
  assignee?: string;
  estimated_minutes?: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  close_reason?: string;
  external_ref?: string;
  labels?: string[];
  dependencies?: Array<{
    issue_id: string;
    depends_on_id: string;
    type: 'blocks' | 'related' | 'parent-child' | 'discovered-from';
    created_at: string;
    created_by: string;
  }>;
  comments?: Array<{
    id: number;
    issue_id: string;
    author: string;
    text: string;
    created_at: string;
  }>;
};

type Dependency = {
  issue_id: string;
  depends_on_id: string;
  type: string;
};

/**
 * Read all issues from JSONL file
 */
export function loadBeadsFromJsonl(beadsPath: string = '.beads'): BeadsData {
  const jsonlPath = join(beadsPath, 'issues.jsonl');

  try {
    // Read the entire file
    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.split('\n');

    const issues: Issue[] = [];
    const byId = new Map<string, Issue>();
    const dependencies: Dependency[] = [];

    // Parse each line as JSON
    for (let lineNum = 0; lineNum < lines.length; lineNum++) {
      const line = lines[lineNum].trim();
      if (!line) continue; // Skip empty lines

      try {
        const jsonlIssue = JSON.parse(line) as JsonlIssue;

        // Convert JSONL issue to Issue type
        const issue: Issue = {
          id: jsonlIssue.id,
          title: jsonlIssue.title,
          description: jsonlIssue.description,
          status: jsonlIssue.status,
          priority: jsonlIssue.priority,
          issue_type: jsonlIssue.issue_type,
          assignee: jsonlIssue.assignee || null,
          labels: jsonlIssue.labels || [],
          created_at: jsonlIssue.created_at,
          updated_at: jsonlIssue.updated_at,
          closed_at: jsonlIssue.closed_at || null,
        };

        issues.push(issue);
        byId.set(issue.id, issue);

        // Collect dependencies for later processing
        if (jsonlIssue.dependencies) {
          for (const dep of jsonlIssue.dependencies) {
            dependencies.push({
              issue_id: dep.issue_id,
              depends_on_id: dep.depends_on_id,
              type: dep.type,
            });
          }
        }
      } catch (parseError) {
        console.error(`Error parsing line ${lineNum + 1}:`, parseError);
        continue;
      }
    }

    // Sort by priority desc, created_at desc (matching SQLite parser)
    issues.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Build dependency relationships (same logic as SQLite parser)
    for (const dep of dependencies) {
      const issue = byId.get(dep.issue_id);
      if (!issue) continue;

      if (dep.type === 'parent-child') {
        // depends_on_id is the parent
        issue.parent = dep.depends_on_id;

        // Add to parent's children
        const parent = byId.get(dep.depends_on_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(dep.issue_id);
        }
      } else if (dep.type === 'blocks') {
        // This issue is blocked by depends_on_id
        if (!issue.blockedBy) issue.blockedBy = [];
        issue.blockedBy.push(dep.depends_on_id);

        // Add to blocker's blocks list
        const blocker = byId.get(dep.depends_on_id);
        if (blocker) {
          if (!blocker.blocks) blocker.blocks = [];
          blocker.blocks.push(dep.issue_id);
        }
      }
    }

    // Group by status
    const byStatus: Record<string, Issue[]> = {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    };

    const stats = {
      total: issues.length,
      open: 0,
      closed: 0,
      blocked: 0,
    };

    for (const issue of issues) {
      // Filter blockedBy to only include non-closed blockers
      if (issue.blockedBy) {
        issue.blockedBy = issue.blockedBy.filter(blockerId => {
          const blocker = byId.get(blockerId);
          return blocker && blocker.status !== 'closed';
        });
      }

      // Auto-move issues with active blockers to 'blocked' status
      const isBlocked = issue.blockedBy && issue.blockedBy.length > 0;
      const actualStatus = isBlocked && issue.status === 'open' ? 'blocked' : issue.status;

      if (byStatus[actualStatus]) {
        byStatus[actualStatus].push(issue);
      }

      // Update stats
      if (actualStatus === 'open') stats.open++;
      else if (actualStatus === 'closed') stats.closed++;
      else if (actualStatus === 'blocked') stats.blocked++;
    }

    return {
      issues,
      byStatus,
      byId,
      stats,
      dataSource: 'jsonl' as const,
    };
  } catch (error) {
    console.error('Error loading beads from JSONL:', error);
    return {
      issues: [],
      byStatus: { 'open': [], 'closed': [], 'in_progress': [], 'blocked': [] },
      byId: new Map(),
      stats: { total: 0, open: 0, closed: 0, blocked: 0 },
      dataSource: 'jsonl' as const,
    };
  }
}
