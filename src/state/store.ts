import { create } from 'zustand';
import type { BeadsData, Issue } from '../types';
import { detectStatusChanges, notifyStatusChange } from '../utils/notifications';
import { LAYOUT, DEFAULT_SORT_CONFIG, type SortConfig, type SortField, type SortOrder } from '../utils/constants';
import { loadConfig, saveSortConfig } from '../utils/persistence';
import { sortIssues } from '../utils/sorting';

type StatusKey = 'open' | 'closed' | 'in_progress' | 'blocked';

interface ColumnState {
  selectedIssueId: string | null;  // Store issue ID instead of index for sorting-independent selection
  scrollOffset: number;
}

// Toast message for user feedback
interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

// Undo history entry
interface UndoEntry {
  action: string;
  issueId: string;
  previousData: Partial<Issue>;
  timestamp: number;
}

interface BeadsStore {
  data: BeadsData;
  previousIssues: Map<string, Issue>; // Track previous state for notifications
  reloadCallback: (() => void) | null; // Callback to reload data from database

  // Terminal dimensions
  terminalWidth: number;
  terminalHeight: number;

  // Navigation - per column
  selectedColumn: number; // 0-3 for open/in_progress/blocked/closed
  columnStates: Record<StatusKey, ColumnState>; // Independent pagination per column
  itemsPerPage: number;

  // UI state
  viewMode: 'kanban' | 'tree' | 'graph' | 'stats' | 'create-issue' | 'edit-issue';
  previousView: 'kanban' | 'tree' | 'graph' | 'stats';
  showHelp: boolean;
  showDetails: boolean;
  showSearch: boolean;
  showFilter: boolean;
  showExportDialog: boolean;
  showThemeSelector: boolean;
  showJumpToPage: boolean;
  showConfirmDialog: boolean;
  confirmDialogData: {
    title: string;
    message: string;
    onConfirm: () => void;
  } | null;
  currentTheme: string;
  searchQuery: string;
  notificationsEnabled: boolean;

  // Toast messages for user feedback
  toastMessage: ToastMessage | null;

  // Undo history
  undoHistory: UndoEntry[];
  maxUndoHistory: number;

  filter: {
    assignee?: string;
    tags?: string[];
    status?: string;
    priority?: number;
  };

  // Sort configuration per column
  sortConfig: SortConfig;
  sortedByStatus: Record<StatusKey, Issue[]>; // Sorted issues per column for navigation

  // Actions
  setData: (data: BeadsData) => void;
  setReloadCallback: (callback: (() => void) | null) => void;
  setFilter: (filter: BeadsStore['filter']) => void;
  getFilteredIssues: () => Issue[];
  setTerminalSize: (width: number, height: number) => void;

  // Navigation actions
  moveUp: () => void;
  moveDown: () => void;
  moveLeft: () => void;
  moveRight: () => void;
  jumpToFirst: () => void;
  jumpToLast: () => void;
  jumpToPage: (page: number) => void;
  getTotalPages: () => number;
  getCurrentPage: () => number;
  toggleHelp: () => void;
  toggleDetails: () => void;
  toggleNotifications: () => void;
  toggleSearch: () => void;
  toggleFilter: () => void;
  toggleExportDialog: () => void;
  toggleThemeSelector: () => void;
  toggleJumpToPage: () => void;
  setTheme: (theme: string) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'kanban' | 'tree' | 'graph' | 'stats' | 'create-issue' | 'edit-issue') => void;
  navigateToCreateIssue: () => void;
  navigateToEditIssue: () => void;
  returnToPreviousView: () => void;
  setSearchQuery: (query: string) => void;
  getSelectedIssue: () => Issue | null;
  getStatusKey: () => StatusKey;
  selectIssueById: (id: string) => boolean;

  // Toast actions
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Confirmation dialog actions
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  hideConfirm: () => void;

  // Undo actions
  addToUndoHistory: (entry: Omit<UndoEntry, 'timestamp'>) => void;
  undo: () => UndoEntry | null;
  clearUndoHistory: () => void;

  // Sort actions
  cycleSortField: () => void;
  toggleSortOrder: () => void;
}

const STATUS_KEYS: StatusKey[] = ['open', 'in_progress', 'blocked', 'closed'];

// Helper function to compute sorted data based on current sort config
function computeSortedByStatus(data: BeadsData, sortConfig: SortConfig): Record<StatusKey, Issue[]> {
  return {
    open: sortIssues(data.byStatus.open, sortConfig.open.sortBy, sortConfig.open.sortOrder),
    in_progress: sortIssues(data.byStatus.in_progress, sortConfig.in_progress.sortBy, sortConfig.in_progress.sortOrder),
    blocked: sortIssues(data.byStatus.blocked, sortConfig.blocked.sortBy, sortConfig.blocked.sortOrder),
    closed: sortIssues(data.byStatus.closed, sortConfig.closed.sortBy, sortConfig.closed.sortOrder),
  };
}

export const useBeadsStore = create<BeadsStore>((set, get) => ({
  data: {
    issues: [],
    byStatus: {
      'open': [],
      'closed': [],
      'in_progress': [],
      'blocked': [],
    },
    byId: new Map(),
    stats: {
      total: 0,
      open: 0,
      closed: 0,
      blocked: 0,
    },
  },

  previousIssues: new Map(),
  reloadCallback: null,

  // Terminal dimensions (defaults, will be updated)
  terminalWidth: 120,
  terminalHeight: 30,

  // Navigation state - per column
  selectedColumn: 0,
  columnStates: {
    'open': { selectedIssueId: null, scrollOffset: 0 },
    'in_progress': { selectedIssueId: null, scrollOffset: 0 },
    'blocked': { selectedIssueId: null, scrollOffset: 0 },
    'closed': { selectedIssueId: null, scrollOffset: 0 },
  },
  itemsPerPage: 10, // Will be recalculated based on terminal height

  // UI state
  viewMode: 'kanban',
  previousView: 'kanban',
  showHelp: false,
  showDetails: false,
  showSearch: false,
  showFilter: false,
  showExportDialog: false,
  showThemeSelector: false,
  showJumpToPage: false,
  showConfirmDialog: false,
  confirmDialogData: null,
  currentTheme: 'default',
  searchQuery: '',
  notificationsEnabled: true, // Enabled by default

  // Toast messages
  toastMessage: null,

  // Undo history
  undoHistory: [],
  maxUndoHistory: 10,

  filter: {},

  sortConfig: loadConfig().sortConfig,
  sortedByStatus: {
    open: [],
    in_progress: [],
    blocked: [],
    closed: [],
  },

  setTerminalSize: (width, height) => {
    const uiOverhead = LAYOUT.uiOverhead;
    const issueCardHeight = LAYOUT.issueCardHeight;
    const availableHeight = Math.max(height - uiOverhead, issueCardHeight);
    const itemsPerPage = Math.max(Math.floor(availableHeight / issueCardHeight), 1);

    set({
      terminalWidth: width,
      terminalHeight: height,
      itemsPerPage,
    });
  },

  setData: (data) => {
    const state = get();

    // Detect status changes and notify (only if enabled)
    if (state.notificationsEnabled) {
      const changes = detectStatusChanges(state.previousIssues, data.byId);
      for (const change of changes) {
        notifyStatusChange(change);
      }
    }

    // Compute sorted data
    const sortedByStatus = computeSortedByStatus(data, state.sortConfig);

    // Validate and reset column states if needed (using sorted data)
    const newColumnStates = { ...state.columnStates };
    for (const statusKey of STATUS_KEYS) {
      const issuesInColumn = sortedByStatus[statusKey] || [];
      const currentState = newColumnStates[statusKey];

      // If no issue is selected, select the first one
      // Or if the selected issue no longer exists in this column, select the first one
      if (!currentState.selectedIssueId || !issuesInColumn.find(i => i.id === currentState.selectedIssueId)) {
        newColumnStates[statusKey] = {
          selectedIssueId: issuesInColumn.length > 0 ? issuesInColumn[0].id : null,
          scrollOffset: 0,
        };
      }
    }

    // Update state
    set({
      data,
      sortedByStatus,
      previousIssues: new Map(data.byId), // Clone for next comparison
      columnStates: newColumnStates,
    });
  },

  setReloadCallback: (callback) => set({ reloadCallback: callback }),

  setFilter: (filter) => set({ filter }),

  getFilteredIssues: () => {
    const { data, filter, searchQuery } = get();
    let issues = data.issues;

    // Text search across title, description, and ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      issues = issues.filter(issue =>
        issue.title.toLowerCase().includes(query) ||
        issue.description?.toLowerCase().includes(query) ||
        issue.id.toLowerCase().includes(query)
      );
    }

    // Filter by assignee
    if (filter.assignee) {
      issues = issues.filter(issue => issue.assignee === filter.assignee);
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      issues = issues.filter(issue =>
        issue.labels?.some(label => filter.tags?.includes(label))
      );
    }

    // Filter by status
    if (filter.status) {
      issues = issues.filter(issue => issue.status === filter.status);
    }

    // Filter by priority
    if (filter.priority !== undefined) {
      issues = issues.filter(issue => issue.priority === filter.priority);
    }

    return issues;
  },

  getStatusKey: () => {
    const { selectedColumn } = get();
    return STATUS_KEYS[selectedColumn];
  },

  getSelectedIssue: () => {
    const { data, selectedColumn, columnStates } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const selectedIssueId = columnStates[statusKey].selectedIssueId;

    if (!selectedIssueId) return null;
    return data.byId.get(selectedIssueId) || null;
  },

  selectIssueById: (id: string) => {
    const { sortedByStatus, columnStates, itemsPerPage } = get();
    const searchId = id.toLowerCase();

    // Search through all status columns
    for (let colIndex = 0; colIndex < STATUS_KEYS.length; colIndex++) {
      const statusKey = STATUS_KEYS[colIndex];
      const issues = sortedByStatus[statusKey] || [];

      const issue = issues.find(issue =>
        issue.id.toLowerCase() === searchId ||
        issue.id.toLowerCase().includes(searchId)
      );

      if (issue) {
        // Found it - update selection with issue ID and scroll position
        const issueIndex = issues.indexOf(issue);
        const newOffset = Math.floor(issueIndex / itemsPerPage) * itemsPerPage;
        set({
          selectedColumn: colIndex,
          columnStates: {
            ...columnStates,
            [statusKey]: {
              selectedIssueId: issue.id,
              scrollOffset: newOffset,
            },
          },
        });
        return true;
      }
    }
    return false;
  },

  getTotalPages: () => {
    const { sortedByStatus, selectedColumn, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];
    return Math.ceil(issues.length / itemsPerPage) || 1;
  },

  getCurrentPage: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const scrollOffset = columnStates[statusKey].scrollOffset;
    return Math.floor(scrollOffset / itemsPerPage) + 1;
  },

  moveUp: () => {
    const { sortedByStatus, selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];
    const currentState = columnStates[statusKey];

    // Find the index of currently selected issue
    const currentIndex = issues.findIndex(i => i.id === currentState.selectedIssueId);

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const newIssue = issues[newIndex];
      let newOffset = currentState.scrollOffset;

      // Scroll up if needed
      if (newIndex < currentState.scrollOffset) {
        newOffset = newIndex;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIssueId: newIssue.id,
            scrollOffset: newOffset,
          },
        },
      });
    }
  },

  moveDown: () => {
    const { sortedByStatus, selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];
    const currentState = columnStates[statusKey];

    // Find the index of currently selected issue
    const currentIndex = issues.findIndex(i => i.id === currentState.selectedIssueId);

    if (currentIndex < issues.length - 1) {
      const newIndex = currentIndex + 1;
      const newIssue = issues[newIndex];
      let newOffset = currentState.scrollOffset;

      // Scroll down if needed
      if (newIndex >= currentState.scrollOffset + itemsPerPage) {
        newOffset = newIndex - itemsPerPage + 1;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIssueId: newIssue.id,
            scrollOffset: newOffset,
          },
        },
      });
    }
  },

  moveLeft: () => {
    const { selectedColumn } = get();
    if (selectedColumn > 0) {
      set({ selectedColumn: selectedColumn - 1 });
    }
  },

  moveRight: () => {
    const { selectedColumn } = get();
    if (selectedColumn < STATUS_KEYS.length - 1) {
      set({ selectedColumn: selectedColumn + 1 });
    }
  },

  jumpToFirst: () => {
    const { sortedByStatus, selectedColumn, columnStates } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIssueId: issues.length > 0 ? issues[0].id : null,
          scrollOffset: 0,
        },
      },
    });
  },

  jumpToLast: () => {
    const { sortedByStatus, selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];
    const lastIndex = Math.max(0, issues.length - 1);
    const newOffset = Math.max(0, lastIndex - itemsPerPage + 1);

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIssueId: issues.length > 0 ? issues[lastIndex].id : null,
          scrollOffset: newOffset,
        },
      },
    });
  },

  jumpToPage: (page: number) => {
    const { sortedByStatus, selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = sortedByStatus[statusKey] || [];
    const totalPages = Math.ceil(issues.length / itemsPerPage) || 1;

    // Clamp page to valid range
    const validPage = Math.max(1, Math.min(page, totalPages));
    const newOffset = (validPage - 1) * itemsPerPage;
    const newIndex = Math.min(newOffset, issues.length - 1);

    set({
      columnStates: {
        ...columnStates,
        [statusKey]: {
          selectedIssueId: newIndex >= 0 && newIndex < issues.length ? issues[newIndex].id : null,
          scrollOffset: newOffset,
        },
      },
      showJumpToPage: false,
    });
  },

  toggleHelp: () => {
    set(state => ({ showHelp: !state.showHelp }));
  },

  toggleDetails: () => {
    set(state => ({ showDetails: !state.showDetails }));
  },

  toggleNotifications: () => {
    set(state => ({ notificationsEnabled: !state.notificationsEnabled }));
  },

  toggleSearch: () => {
    set(state => ({
      showSearch: !state.showSearch,
      // Close filter when opening search
      showFilter: state.showSearch ? state.showFilter : false,
    }));
  },

  toggleFilter: () => {
    set(state => ({
      showFilter: !state.showFilter,
      // Close search when opening filter
      showSearch: state.showFilter ? state.showSearch : false,
    }));
  },

  toggleExportDialog: () => {
    set(state => ({
      showExportDialog: !state.showExportDialog,
      // Close other modals when opening export dialog
      showSearch: state.showExportDialog ? state.showSearch : false,
      showFilter: state.showExportDialog ? state.showFilter : false,
      showThemeSelector: state.showExportDialog ? state.showThemeSelector : false,
    }));
  },

  toggleThemeSelector: () => {
    set(state => ({
      showThemeSelector: !state.showThemeSelector,
      // Close other modals when opening theme selector
      showSearch: state.showThemeSelector ? state.showSearch : false,
      showFilter: state.showThemeSelector ? state.showFilter : false,
      showExportDialog: state.showThemeSelector ? state.showExportDialog : false,
    }));
  },

  toggleJumpToPage: () => {
    set(state => ({
      showJumpToPage: !state.showJumpToPage,
      // Close other modals
      showSearch: false,
      showFilter: false,
      showExportDialog: false,
      showThemeSelector: false,
    }));
  },

  setTheme: (theme) => set({ currentTheme: theme }),

  clearFilters: () => {
    set({
      searchQuery: '',
      filter: {},
      showSearch: false,
      showFilter: false,
    });
  },

  setViewMode: (mode) => {
    const state = get();
    // Save current view as previous if it's not a form view
    if (mode === 'create-issue' || mode === 'edit-issue') {
      if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
        set({ viewMode: mode, previousView: state.viewMode });
      } else {
        set({ viewMode: mode });
      }
    } else {
      set({ viewMode: mode, previousView: mode });
    }
  },

  navigateToCreateIssue: () => {
    const state = get();
    if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
      set({ viewMode: 'create-issue', previousView: state.viewMode });
    } else {
      set({ viewMode: 'create-issue' });
    }
  },

  navigateToEditIssue: () => {
    const state = get();
    if (state.viewMode !== 'create-issue' && state.viewMode !== 'edit-issue') {
      set({ viewMode: 'edit-issue', previousView: state.viewMode });
    } else {
      set({ viewMode: 'edit-issue' });
    }
  },

  returnToPreviousView: () => {
    const state = get();
    set({ viewMode: state.previousView });
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  // Toast actions
  showToast: (message, type) => {
    const toast: ToastMessage = {
      id: Date.now().toString(),
      message,
      type,
      timestamp: Date.now(),
    };
    set({ toastMessage: toast });

    // Auto-clear toast after 3 seconds
    setTimeout(() => {
      const state = get();
      if (state.toastMessage?.id === toast.id) {
        set({ toastMessage: null });
      }
    }, 3000);
  },

  clearToast: () => set({ toastMessage: null }),

  // Confirmation dialog actions
  showConfirm: (title, message, onConfirm) => {
    set({
      showConfirmDialog: true,
      confirmDialogData: { title, message, onConfirm },
    });
  },

  hideConfirm: () => {
    set({
      showConfirmDialog: false,
      confirmDialogData: null,
    });
  },

  // Undo actions
  addToUndoHistory: (entry) => {
    const state = get();
    const newEntry: UndoEntry = {
      ...entry,
      timestamp: Date.now(),
    };
    const newHistory = [newEntry, ...state.undoHistory].slice(0, state.maxUndoHistory);
    set({ undoHistory: newHistory });
  },

  undo: () => {
    const state = get();
    if (state.undoHistory.length === 0) return null;

    const [entry, ...rest] = state.undoHistory;
    set({ undoHistory: rest });
    return entry;
  },

  clearUndoHistory: () => set({ undoHistory: [] }),

  // Sort actions
  cycleSortField: () => {
    const { selectedColumn, sortConfig, data } = get();
    const statusKeys: StatusKey[] = ['open', 'in_progress', 'blocked', 'closed'];
    const currentStatus = statusKeys[selectedColumn];

    const fieldCycle: SortField[] = ['priority', 'created', 'updated', 'title'];
    const currentField = sortConfig[currentStatus].sortBy;
    const currentIndex = fieldCycle.indexOf(currentField);
    const nextField = fieldCycle[(currentIndex + 1) % fieldCycle.length];

    const newSortConfig = {
      ...sortConfig,
      [currentStatus]: {
        ...sortConfig[currentStatus],
        sortBy: nextField,
      },
    };

    // Recompute sorted data with new config
    const sortedByStatus = computeSortedByStatus(data, newSortConfig);

    set({
      sortConfig: newSortConfig,
      sortedByStatus,
    });
    saveSortConfig(newSortConfig);
  },

  toggleSortOrder: () => {
    const { selectedColumn, sortConfig, data } = get();
    const statusKeys: StatusKey[] = ['open', 'in_progress', 'blocked', 'closed'];
    const currentStatus = statusKeys[selectedColumn];

    const newOrder: SortOrder = sortConfig[currentStatus].sortOrder === 'asc' ? 'desc' : 'asc';

    const newSortConfig = {
      ...sortConfig,
      [currentStatus]: {
        ...sortConfig[currentStatus],
        sortOrder: newOrder,
      },
    };

    // Recompute sorted data with new config
    const sortedByStatus = computeSortedByStatus(data, newSortConfig);

    set({
      sortConfig: newSortConfig,
      sortedByStatus,
    });
    saveSortConfig(newSortConfig);
  },
}));

export { STATUS_KEYS };
export type { StatusKey, ToastMessage, UndoEntry };
