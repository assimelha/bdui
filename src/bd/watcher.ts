import { watch, type FSWatcher } from 'fs';
import { join } from 'path';
import type { BeadsData } from '../types';
import { loadBeads } from './parser';

export type UpdateCallback = (data: BeadsData) => void;

/**
 * Watch beads.db for changes and trigger callbacks
 */
export class BeadsWatcher {
  private watcher: FSWatcher | null = null;
  private callbacks: Set<UpdateCallback> = new Set();
  private beadsPath: string;
  private debounceTimeout: Timer | null = null;

  constructor(beadsPath: string) {
    this.beadsPath = beadsPath;
  }

  /**
   * Start watching the beads.db file
   */
  start() {
    if (this.watcher) return;

    const dbPath = join(this.beadsPath, 'beads.db');

    this.watcher = watch(
      dbPath,
      { recursive: false },
      (eventType, filename) => {
        this.handleChange();
      }
    );
  }

  /**
   * Stop watching
   */
  stop() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = null;
    }
  }

  /**
   * Subscribe to bead updates
   */
  subscribe(callback: UpdateCallback): () => void {
    this.callbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  /**
   * Handle file system changes with debouncing
   */
  private handleChange() {
    // Debounce rapid file changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      const data = await loadBeads(this.beadsPath);
      this.notifySubscribers(data);
    }, 100);
  }

  /**
   * Notify all subscribers of updates
   */
  private notifySubscribers(data: BeadsData) {
    for (const callback of this.callbacks) {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in watcher callback:', error);
      }
    }
  }

  /**
   * Manually trigger a reload
   */
  async reload() {
    const data = await loadBeads(this.beadsPath);
    this.notifySubscribers(data);
  }
}
