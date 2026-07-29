import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeSavedSettings,
  useSettingsStore,
} from '../store/settingsStore';

test('saved settings are validated, clamped and stripped of unknown values', () => {
  const normalized = normalizeSavedSettings({
    sfxVolume: 0.456,
    colorblindMode: true,
    vibrationEnabled: 'false',
    reduceMotion: true,
    highContrast: true,
    largeText: true,
    leftHandedMode: true,
    visualAlertsInsteadOfSound: true,
    displayName: 'A'.repeat(40),
    avatarId: 'not-a-real-avatar',
    lastRoomCode: 'ABC123TRAILING',
    lastRoomPlayerId: 'P'.repeat(120),
    lastRoomReconnectToken: 'T'.repeat(700),
    language: 'de',
    setButtonVolume: 'malicious persisted action',
  });

  assert.equal(normalized.buttonVolume, 0.46);
  assert.equal(normalized.vibrationEnabled, true);
  assert.equal(normalized.language, 'tr');
  assert.equal(normalized.displayName.length, 24);
  assert.equal(normalized.avatarId, 'sparkles');
  assert.equal(normalized.lastRoomCode, 'ABC123');
  assert.equal(normalized.lastRoomPlayerId?.length, 96);
  assert.equal(normalized.lastRoomReconnectToken?.length, 512);
  assert.equal('setButtonVolume' in normalized, false);
});

test('settings actions clamp volume and reset preferences without deleting profile data', async () => {
  useSettingsStore.setState({
    displayName: 'Ahmet',
    avatarId: 'rocket',
    lastRoomCode: 'ZXCVBN',
    lastRoomPlayerId: 'player_ahmet',
    lastRoomReconnectToken: 'ZXCVBN:private-token',
    language: 'en',
    colorblindMode: true,
    vibrationEnabled: false,
    reduceMotion: true,
    highContrast: true,
    largeText: true,
    leftHandedMode: true,
    visualAlertsInsteadOfSound: true,
  });

  useSettingsStore.getState().setButtonVolume(-4);
  assert.equal(useSettingsStore.getState().buttonVolume, 0);

  await useSettingsStore.getState().resetSettings();
  const reset = useSettingsStore.getState();
  assert.equal(reset.displayName, 'Ahmet');
  assert.equal(reset.avatarId, 'rocket');
  assert.equal(reset.lastRoomCode, 'ZXCVBN');
  assert.equal(reset.lastRoomPlayerId, 'player_ahmet');
  assert.equal(reset.lastRoomReconnectToken, 'ZXCVBN:private-token');
  assert.equal(reset.language, 'tr');
  assert.equal(reset.colorblindMode, false);
  assert.equal(reset.vibrationEnabled, true);
  assert.equal(reset.reduceMotion, false);
  assert.equal(reset.highContrast, false);
  assert.equal(reset.largeText, false);
  assert.equal(reset.leftHandedMode, false);
  assert.equal(reset.visualAlertsInsteadOfSound, false);
});
