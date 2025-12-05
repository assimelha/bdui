export type DataSource = 'sqlite' | 'jsonl';

export type JsonlDependency = {
  issue_id: string;
  depends_on_id: string;
  type: 'blocks' | 'related' | 'parent-child' | 'discovered-from';
  created_at: string;
  created_by: string;
};

export type JsonlComment = {
  id: number;
  issue_id: string;
  author: string;
  text: string;
  created_at: string;
};

// Matches bd's actual SQLite schema
export interface Issue {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'in_progress' | 'blocked';
  priority: number; // 0-4 (0=lowest, 4=highest)
  issue_type: 'task' | 'epic' | 'bug' | 'feature' | 'chore';
  assignee?: string | null;
  labels?: string[]; // From labels table
  created_at: string;
  updated_at: string;
  closed_at?: string | null;

  // From dependencies table
  parent?: string;
  children?: string[];
  blockedBy?: string[];
  blocks?: string[];

  // Optional JSONL fields
  design?: string;
  acceptance_criteria?: string;
  notes?: string;
  estimated_minutes?: number;
  close_reason?: string;
  external_ref?: string;
  comments?: JsonlComment[];
}

export interface BeadsData {
  issues: Issue[];
  byStatus: Record<string, Issue[]>;
  byId: Map<string, Issue>;
  stats: {
    total: number;
    open: number;
    closed: number;
    blocked: number;
  };
  dataSource: DataSource;
}
