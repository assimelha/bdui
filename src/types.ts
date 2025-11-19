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
}
