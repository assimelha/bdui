#!/usr/bin/env bun
/**
 * Test script to verify notification icons work correctly
 * Run: bun run test-notification.ts
 */

import { showCompletionNotification, showBlockedNotification } from './src/utils/notifications';
import type { Issue } from './src/types';

const testIssue: Issue = {
  id: 'test-abc',
  title: 'Test Notification Issue',
  description: 'This is a test issue to verify notification icons',
  status: 'in_progress',
  priority: 3,
  issue_type: 'feature',
  assignee: 'test-user',
  labels: ['test'],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

console.log('🔔 Testing notification icons...\n');

console.log('1️⃣  Testing COMPLETION notification (green checkmark icon)...');
showCompletionNotification(testIssue);

setTimeout(() => {
  console.log('\n2️⃣  Testing BLOCKED notification (red prohibition icon)...');
  showBlockedNotification(testIssue, ['test-xyz', 'test-123']);

  setTimeout(() => {
    console.log('\n✅ Notification tests complete!');
    console.log('\nCheck your notification center to verify:');
    console.log('  - Completed notification has a green checkmark icon');
    console.log('  - Blocked notification has a red prohibition icon');
    console.log('\nIf you don\'t see custom icons, check:');
    console.log('  - assets/icons/completed.png exists');
    console.log('  - assets/icons/blocked.png exists');
    console.log('  - File paths are correctly resolved');
    process.exit(0);
  }, 2000);
}, 2000);
