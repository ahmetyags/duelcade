import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getTurnModeCopy,
  TURN_DURATION,
  TURN_RESULTS,
  TURN_UI,
} from '../src/i18n/turnGames';
import type { TurnGameMode } from '../types/turnGame';

const MODES: TurnGameMode[] = [
  'rune_grid',
  'connect_four',
  'memory_pairs',
  'pipe_circuit',
  'resonance_dials',
  'cipher_clash',
  'circuit_claim',
  'neon_trail',
  'gateway_race',
  'polarity_war',
];

test('every turn game has complete and distinct English and Turkish copy', () => {
  for (const mode of MODES) {
    const english = getTurnModeCopy('en', mode);
    const turkish = getTurnModeCopy('tr', mode);
    for (const field of ['title', 'description', 'winReason'] as const) {
      assert.ok(english[field].length > 0);
      assert.ok(turkish[field].length > 0);
      assert.notEqual(english[field], turkish[field]);
    }
    assert.doesNotMatch(JSON.stringify(english), /[ÇĞİÖŞÜçğıöşü]/);
    assert.notDeepEqual(english.help, turkish.help);
  }
});

test('turn UI, results and duration controls switch language', () => {
  assert.equal(TURN_UI.en.chat, 'Chat');
  assert.equal(TURN_RESULTS.en.home, 'Main menu');
  assert.equal(TURN_DURATION.en.short(5), '5 min');
  assert.notEqual(TURN_UI.en.howToPlay, TURN_UI.tr.howToPlay);
});
