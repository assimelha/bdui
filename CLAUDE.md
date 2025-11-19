# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Note**: This project uses [bd (beads)](https://github.com/steveyegge/beads) for issue tracking. Use `bd` commands instead of markdown TODOs. See AGENTS.md for workflow details.

## Project Overview

BD TUI is a real-time Text User Interface visualizer for the [bd (beads)](https://github.com/steveyegge/beads) issue tracker. It provides multiple views (Kanban, Tree, Dependency Graph) of issues stored in a SQLite database, with real-time file watching, search/filter capabilities, and native notifications.

**Runtime**: Bun (required - uses `bun:sqlite` and Bun's native APIs)
**UI Framework**: Ink (React for CLIs)
**State Management**: Zustand
**Target**: Single-binary compilation for macOS, Linux, and Windows

## Development Commands

```bash
# Run in development mode
bun run dev

# Test notifications (useful for verifying notification setup)
bun run test:notifications

# Build single binary for current platform
bun run build

# Build for all platforms (creates dist/ directory)
bun run build:all

# Build for specific platforms
bun run build:macos   # Creates arm64 and x64 binaries
bun run build:linux   # x64 only
bun run build:windows # x64 only
```

## Architecture

### Data Flow

1. **Database Reading** (`src/bd/parser.ts`)
   - `loadBeads()` reads directly from bd's SQLite database (`beads.db`)
   - Queries three tables: `issues`, `labels`, `dependencies`
   - Builds a normalized data structure (`BeadsData`) with:
     - `issues[]` - flat array of all issues
     - `byStatus{}` - issues grouped by status (open, in_progress, blocked, closed)
     - `byId` - Map for O(1) issue lookups
     - `stats` - aggregated counts
   - **Important**: Issues with `blockedBy` dependencies are automatically moved to "blocked" status even if marked as "open"

2. **File Watching** (`src/bd/watcher.ts`)
   - `BeadsWatcher` uses Node.js `fs.watch` to monitor `beads.db`
   - Implements debouncing (100ms) to handle rapid database writes (SQLite WAL mode)
   - Pub/sub pattern with multiple subscribers
   - Manual reload available via `reload()` method

3. **State Management** (`src/state/store.ts`)
   - Zustand store is the single source of truth for UI state
   - **Key state**:
     - `data: BeadsData` - current issue data from database
     - `previousIssues: Map<string, Issue>` - for detecting status changes (notifications)
     - `columnStates: Record<StatusKey, ColumnState>` - **per-column independent pagination/selection**
     - `viewMode` - kanban | tree | graph | stats
     - `filter` - assignee, tags, priority, status filters
     - `searchQuery` - text search across title, description, ID
     - `currentTheme` - active color scheme (default, ocean, forest, sunset, monochrome)
     - UI modal states - `showSearch`, `showFilter`, `showCreateForm`, `showEditForm`, `showExportDialog`, `showThemeSelector`
   - **Critical**: When search/filter is active, `getFilteredIssues()` returns filtered issues and Board rebuilds the `byStatus` structure dynamically
   - **Notification logic**: `setData()` compares `previousIssues` with new data to detect status changes and triggers notifications if enabled

4. **Component Hierarchy**
   ```
   App.tsx (root - keyboard handling, watcher setup)
   └── Board.tsx (view router)
       ├── KanbanView (default view, keyboard: 1)
       │   ├── SearchInput (when showSearch=true, keyboard: /)
       │   ├── FilterPanel (when showFilter=true, keyboard: f)
       │   ├── CreateIssueForm (when showCreateForm=true, keyboard: N)
       │   ├── EditIssueForm (when showEditForm=true, keyboard: e)
       │   ├── ExportDialog (when showExportDialog=true, keyboard: x)
       │   ├── ThemeSelector (when showThemeSelector=true, keyboard: t)
       │   ├── StatusColumn × 4 (responsive, may hide columns on narrow screens)
       │   │   └── IssueCard × N (paginated)
       │   └── DetailPanel (when showDetails=true, keyboard: Space/Enter)
       ├── TreeView (hierarchical parent-child view, keyboard: 2)
       ├── DependencyGraph (ASCII art graph, keyboard: 3)
       ├── StatsView (analytics dashboard, keyboard: 4)
       └── HelpOverlay (keyboard: ?)
   ```

### Per-Column Pagination

Each status column maintains **independent state** in `columnStates`:
- `selectedIndex` - which issue is selected (0-based)
- `scrollOffset` - pagination offset for current view

This allows each column to have different lengths (e.g., 10 open issues, 50 closed issues) with separate scroll positions. Navigation (↑/↓) automatically adjusts `scrollOffset` when selection moves out of view.

### Input Handling Modes

The app has **modal input handling** in `App.tsx`:
- **Normal mode**: Arrow keys, vim keys (hjkl), view switching (1-4), help (?), etc.
- **Modal overlays**: When any of these are active, they capture input and ESC closes them:
  - Search mode (`showSearch=true`) - SearchInput captures input
  - Filter mode (`showFilter=true`) - FilterPanel captures input
  - Create form (`showCreateForm=true`) - CreateIssueForm captures input
  - Edit form (`showEditForm=true`) - EditIssueForm captures input
  - Export dialog (`showExportDialog=true`) - ExportDialog captures input
  - Theme selector (`showThemeSelector=true`) - ThemeSelector captures input

When any modal is active, normal navigation is disabled to avoid conflicts.

### Filtering Implementation

The filtering system works differently from typical React patterns:
1. User activates search (`/`) or filter (`f`)
2. Store state updates (`searchQuery`, `filter`)
3. Board.tsx calls `getFilteredIssues()` which applies all filters
4. Board rebuilds `byStatus` structure from filtered results using `useMemo`
5. Filtered data flows down to StatusColumn components
6. **Important**: Column states (selection/scroll) persist across filter changes, which may cause issues if filtered data removes the selected issue - this is handled by store validation in `setData()`

### Database Schema (BD)

The app reads from bd's existing schema:
- `issues` table: id (text primary key like "altair-abc"), title, description, status, priority (0-4), issue_type, assignee, timestamps
- `labels` table: many-to-many with issues (issue_id, label)
- `dependencies` table: (issue_id, depends_on_id, type)
  - `type='parent-child'`: depends_on_id is parent of issue_id
  - `type='blocks'`: issue_id is blocked by depends_on_id

## Key Patterns

### Issue Creation and Modification

The app uses `bd` CLI commands via `src/bd/commands.ts` to modify the database:
- **Creating issues**: `createIssue()` wraps `bd new` with params (title, description, priority, type, assignee, labels, parent)
- **Updating issues**: `updateIssue()` wraps `bd edit` with params (title, description, priority, status, assignee, labels)
- **Note**: These commands shell out to `bd` CLI using Node.js `child_process.exec`
- After any modification, the file watcher detects the database change and triggers a UI refresh
- Forms (CreateIssueForm, EditIssueForm) call these functions and then invoke `reloadCallback()` to ensure immediate update

### Adding New View Modes

1. Add view type to `viewMode` union type in `store.ts`
2. Create component in `src/components/`
3. Import and render in `Board.tsx`'s view router
4. Add keyboard shortcut in `App.tsx` (numbers 5-9 still available)
5. Update `HelpOverlay.tsx` with new shortcut

### Adding New Filters

1. Add field to `filter` interface in `store.ts`
2. Update `getFilteredIssues()` logic to handle new filter
3. Add UI in `FilterPanel.tsx` (Tab cycles through filter types)
4. Update `isSelected()` and input handling in FilterPanel

### Themes

The app supports 5 built-in color schemes (`src/themes/themes.ts`):
- **default** - Classic blue/cyan theme with high contrast
- **ocean** - Blue and cyan tones for a calm aquatic feel
- **forest** - Green-focused theme inspired by nature
- **sunset** - Warm magenta and yellow tones
- **monochrome** - Clean grayscale theme

Each theme defines colors for: primary, secondary, accent, success, warning, error, text (primary/secondary/muted), and background colors. Themes are stored in Zustand store (`currentTheme`) and applied throughout components via the active theme object.

### Export System

Issues can be exported in three formats (`src/utils/export.ts`):
- **Markdown** - Formatted with headers, lists, and metadata
- **JSON** - Complete issue data structure
- **Plain text** - Simple readable format

Export targets:
- **Clipboard** - Uses `pbcopy` (macOS), `xclip`/`xsel` (Linux), `clip` (Windows)
- **File** - Saves to `{issue-id}.{ext}` in current directory

### Responsive Layout

Kanban view adapts to terminal size:
- `terminalWidth`/`terminalHeight` tracked in store via stdout resize events
- `itemsPerPage` calculated dynamically based on height (accounting for ~17 lines of UI overhead, 8 lines per issue card)
- Column visibility: 4 cols (≥160 width), 2 cols (80-159 width), 1 col (<80 width)
- Detail panel auto-hides below 160 width (requires 4*37 + 55 + 10 = 213 cols ideally)

### Notifications

Uses `node-notifier` for cross-platform desktop notifications:
- Triggered by status changes detected in `setData()` via `detectStatusChanges()`
- Two notification types: "completed" (→ closed), "blocked" (blockedBy added)
- Terminal bell + OS notification
- Toggle with `n` key, state shown in footer
- **Custom Icons**:
  - Located in `assets/icons/` directory
  - `completed.png`: Green checkmark icon for completed tasks
  - `blocked.png`: Red prohibition icon for blocked tasks
  - Platform-specific support: macOS (contentImage/appIcon), Linux/Windows (icon parameter)
  - Automatic fallback if icons are missing

## Component Guidelines

- **StatusColumn**: Receives issues array, renders visible slice based on `scrollOffset` and `itemsPerPage`
- **IssueCard**: Pure presentation component, shows priority (colored P0-P4), type, title, labels
- **DetailPanel**: Shows full issue details including dependencies (blockedBy, blocks, parent, children)
- **SearchInput**: Modal input component, uses `useInput` hook, ESC to close, real-time filtering
- **FilterPanel**: Complex modal with Tab navigation between filter types, Space/Enter to toggle selections
- **CreateIssueForm**: Modal form for creating issues, Tab navigation between fields, calls `createIssue()` from commands.ts
- **EditIssueForm**: Modal form for editing issues, pre-populated with current values, calls `updateIssue()` from commands.ts
- **ExportDialog**: Modal for exporting issues, arrow keys to select format/action, uses clipboard or file system
- **ThemeSelector**: Modal for changing themes, shows live preview, up/down to select, Enter to apply
- **TreeView**: Hierarchical view, shows parent-child relationships, expandable tree structure
- **DependencyGraph**: ASCII art visualization, shows blocking relationships and dependency levels
- **StatsView**: Analytics dashboard with bar charts for status/priority/type distribution, top assignees/labels

## Bun-Specific Code

- `import { Database } from 'bun:sqlite'` - native SQLite driver (faster than better-sqlite3)
- Compilation targets use `bun build --compile` with platform-specific flags
- No build step needed for development - Bun runs TypeScript/JSX directly

## Testing Locally

Requires a `.beads/` directory with `beads.db` in current or parent directory. The app walks up the directory tree from `process.cwd()` to find it (like git).

To test without a real bd installation, create a minimal database:
```sql
CREATE TABLE issues (id TEXT PRIMARY KEY, title TEXT, description TEXT, status TEXT, priority INTEGER, issue_type TEXT, assignee TEXT, created_at TEXT, updated_at TEXT, closed_at TEXT);
CREATE TABLE labels (issue_id TEXT, label TEXT);
CREATE TABLE dependencies (issue_id TEXT, depends_on_id TEXT, type TEXT);
```

## Common Development Considerations

### Adding New Features

When adding new features to BD TUI:
1. **Modal state management**: If adding a new modal/overlay, follow the pattern:
   - Add `showXModal` boolean to store
   - Add `toggleXModal` action that closes other modals when opening
   - Check for modal active state in `App.tsx` input handler
   - Use absolute positioning with centered coordinates

2. **Keyboard shortcuts**: Always update both:
   - `App.tsx` input handler for the keyboard binding
   - `HelpOverlay.tsx` to document the new shortcut
   - Footer text if it's a commonly-used action

3. **Database modifications**: Never write directly to SQLite:
   - Always use bd CLI via `src/bd/commands.ts`
   - Call `reloadCallback()` after mutations to trigger UI refresh
   - The watcher will pick up changes automatically

4. **Theming**: To make components theme-aware:
   - Import `useBeadsStore` and get `currentTheme`
   - Look up theme object from `themes.ts`
   - Use theme colors instead of hardcoded color strings

5. **Responsive behavior**: Consider terminal size constraints:
   - Test with various widths (80, 120, 160+ columns)
   - Use `terminalWidth`/`terminalHeight` from store
   - Hide or stack elements on narrow screens

### Performance Tips

- **Filtering**: `getFilteredIssues()` runs on every render when filters are active. The `useMemo` in Board.tsx caches the filtered `byStatus` structure, but be mindful of expensive operations in filters.
- **File watching**: The 100ms debounce in BeadsWatcher is tuned for SQLite WAL mode. Don't reduce it or you'll get duplicate updates.
- **Pagination**: Each column independently paginates. `itemsPerPage` is calculated dynamically, so very tall terminals will show more issues per column automatically.
