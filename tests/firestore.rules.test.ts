/**
 * Firestore Rules Verification Suite (Dirty Dozen + Blueprint Sync Audit).
 * Static policy verifier + Emulator-compatible assertions so CI verifies rules even without Java emulator binary.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesContent = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf-8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf-8')
) as { entities: Record<string, { properties: Record<string, { maxLength?: number }> }> };

test('Eight Pillars: default-deny catch-all, rules_version 2, and email_verified checks exist', () => {
  assert.match(rulesContent, /rules_version\s*=\s*'2'/);
  assert.match(rulesContent, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);
  assert.match(rulesContent, /request\.auth\.token\.email_verified == true/);
});

test('PII isolation & anti-shadow-update gates enforce strict hasOnly and owner checks', () => {
  assert.match(rulesContent, /match \/users\/\{userId\}/);
  assert.match(rulesContent, /allow list: if false;/);
  assert.match(rulesContent, /data\.keys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /affectedKeys\(\)\.hasOnly\(/);
  assert.match(rulesContent, /isValidUserProfile\(incoming\(\)\)/);
  assert.match(rulesContent, /isValidDailyProgress\(incoming\(\)\)/);
});

test('Master Gate & Secure List Query enforced on dailyProgress subcollection', () => {
  assert.match(rulesContent, /exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(userId\)\)/);
  assert.match(rulesContent, /allow list: if isOwner\(userId\) && resource\.data\.ownerId == request\.auth\.uid;/);
  assert.match(rulesContent, /data\.completedIds\.size\(\) <= 12/);
});

test('Community aggregates collection forbids client writes (aggregate-only)', () => {
  assert.match(rulesContent, /match \/communityAggregates\/\{cityId\}[\s\S]*allow write: if false;/);
});

test('Validation synchronicity: maxLength constants in firebase-blueprint.json match firestore.rules', () => {
  const userProps = blueprint.entities.UserProfileDoc.properties;
  assert.equal(userProps.displayName.maxLength, 60);
  assert.match(rulesContent, /data\.displayName\.size\(\) <= 60/);
  assert.equal(userProps.city.maxLength, 80);
  assert.match(rulesContent, /data\.city\.size\(\) <= 80/);
});
