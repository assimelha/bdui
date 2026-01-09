import type { Issue } from '../bd/types';
import type { SortField, SortOrder } from './constants';

/**
 * Compare two issues based on sort field and order
 */
function compareIssues(a: Issue, b: Issue, sortBy: SortField, sortOrder: SortOrder): number {
  let result = 0;

  switch (sortBy) {
    case 'priority':
      result = (a.priority ?? 0) - (b.priority ?? 0);
      break;

    case 'created':
      result = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      break;

    case 'updated':
      const aTime = a.updated_at ? new Date(a.updated_at).getTime() : new Date(a.created_at).getTime();
      const bTime = b.updated_at ? new Date(b.updated_at).getTime() : new Date(b.created_at).getTime();
      result = aTime - bTime;
      break;

    case 'title':
      result = (a.title || '').localeCompare(b.title || '');
      break;
  }

  return sortOrder === 'asc' ? result : -result;
}

/**
 * Sort an array of issues based on configuration
 */
export function sortIssues(issues: Issue[], sortBy: SortField, sortOrder: SortOrder): Issue[] {
  return [...issues].sort((a, b) => compareIssues(a, b, sortBy, sortOrder));
}
