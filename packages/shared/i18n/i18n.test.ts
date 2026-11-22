import test from 'node:test';
import assert from 'node:assert/strict';
import { I18N_DICTIONARY, t } from './index';

test('i18n key parity across English, Hindi (Devanagari), and Tamil', () => {
  const enKeys = Object.keys(I18N_DICTIONARY.en).sort();
  const hiKeys = Object.keys(I18N_DICTIONARY.hi).sort();
  const taKeys = Object.keys(I18N_DICTIONARY.ta).sort();

  assert.deepEqual(hiKeys, enKeys, 'Hindi keys must match English keys exactly');
  assert.deepEqual(taKeys, enKeys, 'Tamil keys must match English keys exactly');

  for (const key of enKeys as Array<keyof typeof I18N_DICTIONARY.en>) {
    assert.ok(t('en', key).trim().length > 0, `en.${key} must be non-empty`);
    assert.ok(t('hi', key).trim().length > 0, `hi.${key} must be non-empty`);
    assert.ok(t('ta', key).trim().length > 0, `ta.${key} must be non-empty`);
  }

  // Verify real Devanagari and Tamil script characters are present
  assert.match(t('hi', 'dailyPlanTitle'), /[\u0900-\u097F]/);
  assert.match(t('ta', 'dailyPlanTitle'), /[\u0B80-\u0BFF]/);
});
