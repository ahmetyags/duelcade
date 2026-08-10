import assert from 'node:assert/strict';
import test from 'node:test';

import { isRegistrationPasswordValid, passwordRequirements } from '../services/PasswordPolicy';

test('registration password requirements update independently', () => {
  assert.deepEqual(passwordRequirements('short'), [
    { key: 'length', valid: false },
    { key: 'lower', valid: true },
    { key: 'upper', valid: false },
    { key: 'number', valid: false },
  ]);
  assert.equal(isRegistrationPasswordValid('Duelcade8'), true);
  assert.equal(isRegistrationPasswordValid('duelcade8'), false);
  assert.equal(isRegistrationPasswordValid('DUELCADE8'), false);
  assert.equal(isRegistrationPasswordValid('Duelcade!'), false);
});
