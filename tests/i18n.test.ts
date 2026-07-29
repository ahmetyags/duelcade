import assert from 'node:assert/strict';
import test from 'node:test';

import { translate, translateGameText, translateGameValue } from '../src/i18n';

test('Turkish and English dictionaries switch the complete interface language', () => {
  assert.equal(translate('tr', 'home.create'), 'Maç Oluştur');
  assert.equal(translate('en', 'home.create'), 'Create a Match');
  assert.equal(
    translate('tr', 'lobby.players', { count: 2 }),
    'OYUNCULAR (2/2)',
  );
});

test('server-authored game values are localized without changing protocol values', () => {
  assert.equal(translateGameText('AUTHORIZED CODE', 'tr'), 'YETKİLİ KOD');
  assert.equal(translateGameText('AUTHORIZED CODE', 'en'), 'AUTHORIZED CODE');
  assert.equal(translateGameValue(['UP', 'RIGHT', 'red'], 'tr'), 'YUKARI, SAĞ, kırmızı');
});
