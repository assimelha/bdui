import { create } from 'zustand';
import type { BeadsData, Issue } from '../types';
import { detectStatusChanges, notifyStatusChange } from '../utils/notifications';

type StatusKey = 'open' | 'closed' | 'in_progress' | 'blocked';

interface ColumnState {
  selectedIndex: number;
  scrollOffset: number;
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
  viewMode: 'kanban' | 'tree' | 'graph' | 'stats';
  showHelp: boolean;
  showDetails: boolean;
  showSearch: boolean;
  showFilter: boolean;
  showCreateForm: boolean;
  showEditForm: boolean;
  showExportDialog: boolean;
  showThemeSelector: boolean;
  currentTheme: string;
  searchQuery: string;
  notificationsEnabled: boolean;

  filter: {
    assignee?: string;
    tags?: string[];
    status?: string;
    priority?: number;
  };

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
  toggleHelp: () => void;
  toggleDetails: () => void;
  toggleNotifications: () => void;
  toggleSearch: () => void;
  toggleFilter: () => void;
  toggleCreateForm: () => void;
  toggleEditForm: () => void;
  toggleExportDialog: () => void;
  toggleThemeSelector: () => void;
  setTheme: (theme: string) => void;
  clearFilters: () => void;
  setViewMode: (mode: 'kanban' | 'tree' | 'graph' | 'stats') => void;
  setSearchQuery: (query: string) => void;
  getSelectedIssue: () => Issue | null;
  getStatusKey: () => StatusKey;
}

const STATUS_KEYS: StatusKey[] = ['open', 'in_progress', 'blocked', 'closed'];

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
    'open': { selectedIndex: 0, scrollOffset: 0 },
    'in_progress': { selectedIndex: 0, scrollOffset: 0 },
    'blocked': { selectedIndex: 0, scrollOffset: 0 },
    'closed': { selectedIndex: 0, scrollOffset: 0 },
  },
  itemsPerPage: 10, // Will be recalculated based on terminal height

  // UI state
  viewMode: 'kanban',
  showHelp: false,
  showDetails: false,
  showSearch: false,
  showFilter: false,
  showCreateForm: false,
  showEditForm: false,
  showExportDialog: false,
  showThemeSelector: false,
  currentTheme: 'default',
  searchQuery: '',
  notificationsEnabled: true, // Enabled by default

  filter: {},

  setTerminalSize: (width, height) => {
    // Calculate itemsPerPage based on available height
    // More conservative calculation to prevent overflow:
    // Header (title + stats): 4 lines
    // Footer: 3 lines
    // Column header: 3 lines
    // Scroll indicators (when shown): 2 lines
    // Pagination info (when shown): 2 lines
    // Margins and padding: 3 lines
    // Total overhead: ~17 lines
    // Each issue card: 8 lines (card height + gap)

    const uiOverhead = 17;
    const issueCardHeight = 8;
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

    // Validate and reset column states if needed
    const newColumnStates = { ...state.columnStates };
    for (const statusKey of STATUS_KEYS) {
      const issuesInColumn = data.byStatus[statusKey]?.length || 0;
      const currentState = newColumnStates[statusKey];

      if (currentState.selectedIndex >= issuesInColumn) {
        newColumnStates[statusKey] = {
          selectedIndex: Math.max(0, issuesInColumn - 1),
          scrollOffset: 0,
        };
      }
    }

    // Update state
    set({
      data,
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
    const issues = data.byStatus[statusKey] || [];
    const selectedIndex = columnStates[statusKey].selectedIndex;
    return issues[selectedIndex] || null;
  },

  moveUp: () => {
    const { selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const currentState = columnStates[statusKey];

    if (currentState.selectedIndex > 0) {
      const newIndex = currentState.selectedIndex - 1;
      let newOffset = currentState.scrollOffset;

      // Scroll up if needed
      if (newIndex < currentState.scrollOffset) {
        newOffset = newIndex;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIndex: newIndex,
            scrollOffset: newOffset,
          },
        },
      });
    }
  },

  moveDown: () => {
    const { data, selectedColumn, columnStates, itemsPerPage } = get();
    const statusKey = STATUS_KEYS[selectedColumn];
    const issues = data.byStatus[statusKey] || [];
    const currentState = columnStates[statusKey];

    if (currentState.selectedIndex < issues.length - 1) {
      const newIndex = currentState.selectedIndex + 1;
      let newOffset = currentState.scrollOffset;

      // Scroll down if needed
      if (newIndex >= currentState.scrollOffset + itemsPerPage) {
        newOffset = newIndex - itemsPerPage + 1;
      }

      set({
        columnStates: {
          ...columnStates,
          [statusKey]: {
            selectedIndex: newIndex,
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

  toggleCreateForm: () => {
    set(state => ({
      showCreateForm: !state.showCreateForm,
      // Close other modals when opening create form
      showEditForm: state.showCreateForm ? state.showEditForm : false,
      showSearch: state.showCreateForm ? state.showSearch : false,
      showFilter: state.showCreateForm ? state.showFilter : false,
    }));
  },

  toggleEditForm: () => {
    set(state => ({
      showEditForm: !state.showEditForm,
      // Close other modals when opening edit form
      showCreateForm: state.showEditForm ? state.showCreateForm : false,
      showSearch: state.showEditForm ? state.showSearch : false,
      showFilter: state.showEditForm ? state.showFilter : false,
      showExportDialog: state.showEditForm ? state.showExportDialog : false,
    }));
  },

  toggleExportDialog: () => {
    set(state => ({
      showExportDialog: !state.showExportDialog,
      // Close other modals when opening export dialog
      showCreateForm: state.showExportDialog ? state.showCreateForm : false,
      showEditForm: state.showExportDialog ? state.showEditForm : false,
      showSearch: state.showExportDialog ? state.showSearch : false,
      showFilter: state.showExportDialog ? state.showFilter : false,
      showThemeSelector: state.showExportDialog ? state.showThemeSelector : false,
    }));
  },

  toggleThemeSelector: () => {
    set(state => ({
      showThemeSelector: !state.showThemeSelector,
      // Close other modals when opening theme selector
      showCreateForm: state.showThemeSelector ? state.showCreateForm : false,
      showEditForm: state.showThemeSelector ? state.showEditForm : false,
      showSearch: state.showThemeSelector ? state.showSearch : false,
      showFilter: state.showThemeSelector ? state.showFilter : false,
      showExportDialog: state.showThemeSelector ? state.showExportDialog : false,
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

  setViewMode: (mode) => set({ viewMode: mode }),

  setSearchQuery: (query) => set({ searchQuery: query }),
}));
