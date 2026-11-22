import assert from 'node:assert/strict';
import test from 'node:test';
import { DEMO_SCENARIOS } from '../../packages/shared/demoScenarios';
import {
  DEFAULT_UNHEALTHY_THRESHOLD,
  evaluateAndTriggerAqiAlert,
  isUnhealthyAqi,
} from './aqiNotifications';

test('isUnhealthyAqi identifies Unhealthy AQI threshold (>= 151) accurately', () => {
  assert.equal(DEFAULT_UNHEALTHY_THRESHOLD, 151);
  assert.equal(isUnhealthyAqi(85), false);
  assert.equal(isUnhealthyAqi(150), false);
  assert.equal(isUnhealthyAqi(151), true);
  assert.equal(isUnhealthyAqi(420), true);
  assert.equal(isUnhealthyAqi(180, 201), false);
  assert.equal(isUnhealthyAqi(205, 201), true);
});

test('evaluateAndTriggerAqiAlert skips below-threshold Moderate AQI unless forced', async () => {
  const coimbatore = DEMO_SCENARIOS.coimbatore.aqiSnapshot;
  const skipped = await evaluateAndTriggerAqiAlert(coimbatore, DEFAULT_UNHEALTHY_THRESHOLD, false);
  assert.equal(skipped.triggered, false);
  assert.equal(skipped.channel, 'below-threshold');

  const forced = await evaluateAndTriggerAqiAlert(coimbatore, DEFAULT_UNHEALTHY_THRESHOLD, true);
  assert.equal(forced.triggered, true);
});

test('evaluateAndTriggerAqiAlert triggers for Delhi AQI 420 Severe smog', async () => {
  const delhi = DEMO_SCENARIOS.delhi.aqiSnapshot;
  const res = await evaluateAndTriggerAqiAlert(delhi, DEFAULT_UNHEALTHY_THRESHOLD, false);
  assert.equal(res.triggered, true);
  assert.match(res.message, /New Delhi/);
  assert.match(res.message, /420/);
});
