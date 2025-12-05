import { Database } from 'bun:sqlite';
import { stat } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { loadBeadsFromJsonl } from './jsonl-parser';
import type { Issue, BeadsData, DataSource } from '../types';

/**
 * Determine which data source is available in the .beads directory
 * Returns 'sqlite' if beads.db exists, 'jsonl' if only issues.jsonl exists
 */
export function getDataSource(beadsPath: string): DataSource | null {
  const dbPath = join(beadsPath, 'beads.db');
  const jsonlPath = join(beadsPath, 'issues.jsonl');

  // Check SQLite first (preferred)
  if (existsSync(dbPath)) {
    return 'sqlite';
  }

  // Check JSONL as fallback
  if (existsSync(jsonlPath)) {
    return 'jsonl';
  }

  return null;
}

/**
 * Read all issues from bd SQLite database
 */
async function loadBeadsFromSqlite(beadsPath: string = '.beads'): Promise<BeadsData> {
  const dbPath = join(beadsPath, 'beads.db');

  try {
    // Verify file exists first
    try {
      await stat(dbPath);
    } catch {
      throw new Error(`Database not found at ${dbPath}`);
    }

    // Open database - remove readonly flag as WAL mode needs write access
    const db = new Database(dbPath);

    // Load all issues
    const issues: Issue[] = db.query(`
      SELECT
        id,
        title,
        description,
        status,
        priority,
        issue_type,
        assignee,
        created_at,
        updated_at,
        closed_at
      FROM issues
      ORDER BY priority DESC, created_at DESC
    `).all() as Issue[];

    // Load labels for each issue
    const labelsMap = new Map<string, string[]>();
    const labelsRows = db.query('SELECT issue_id, label FROM labels').all() as Array<{issue_id: string, label: string}>;

    for (const row of labelsRows) {
      if (!labelsMap.has(row.issue_id)) {
        labelsMap.set(row.issue_id, []);
      }
      labelsMap.get(row.issue_id)!.push(row.label);
    }

    // Load dependencies
    const dependencies = db.query(`
      SELECT issue_id, depends_on_id, type
      FROM dependencies
    `).all() as Array<{issue_id: string, depends_on_id: string, type: string}>;

    const byId = new Map<string, Issue>();

    // Attach labels to issues
    for (const issue of issues) {
      issue.labels = labelsMap.get(issue.id) || [];
      byId.set(issue.id, issue);
    }

    // Build dependency relationships
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

    let stats = {
      total: issues.length,
      open: 0,
      closed: 0,
      blocked: 0,
    };

    for (const issue of issues) {
      // Filter blockedBy to only include open blockers (closed blockers don't block anymore)
      if (issue.blockedBy) {
        issue.blockedBy = issue.blockedBy.filter(blockerId => {
          const blocker = byId.get(blockerId);
          return blocker && blocker.status !== 'closed';
        });
      }

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

    db.close();

    return { 
      issues, 
      byStatus, 
      byId, 
      stats,
      dataSource: 'sqlite' as const
    };
  } catch (error) {
    console.error('Error loading beads from database:', error);
    return {
      issues: [],
      byStatus: { 'open': [], 'closed': [], 'in_progress': [], 'blocked': [] },
      byId: new Map(),
      stats: { total: 0, open: 0, closed: 0, blocked: 0 },
      dataSource: 'sqlite' as const
    };
  }
}

/**
 * Read all issues from bd data store (SQLite preferred, JSONL fallback)
 */
export async function loadBeads(beadsPath: string = '.beads'): Promise<BeadsData> {
  const source = getDataSource(beadsPath);

  if (source === 'sqlite') {
    return loadBeadsFromSqlite(beadsPath);
  } else if (source === 'jsonl') {
    return loadBeadsFromJsonl(beadsPath);
  } else {
    throw new Error(`No data source found at ${beadsPath} (checked beads.db and issues.jsonl)`);
  }
}

/**
 * Find .beads/ directory by walking up from current directory
 */
export async function findBeadsDir(startPath: string = process.cwd()): Promise<string | null> {
  let currentPath = startPath;

  while (true) {
    const beadsPath = join(currentPath, '.beads');

    try {
      const stats = await stat(beadsPath);
      if (stats.isDirectory()) {
        // Verify at least one data source exists
        const source = getDataSource(beadsPath);
        if (source) {
          return beadsPath;
        }
      }
    } catch {
      // Directory doesn't exist, continue
    }

    const parentPath = join(currentPath, '..');
    if (parentPath === currentPath) {
      // Reached root
      return null;
    }

    currentPath = parentPath;
  }
}
