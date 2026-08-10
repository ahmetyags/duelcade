export interface PasswordRequirement {
  key: 'length' | 'lower' | 'upper' | 'number';
  valid: boolean;
}

export function passwordRequirements(password: string): PasswordRequirement[] {
  return [
    { key: 'length', valid: password.length >= 8 },
    { key: 'lower', valid: /[a-z]/.test(password) },
    { key: 'upper', valid: /[A-Z]/.test(password) },
    { key: 'number', valid: /[0-9]/.test(password) },
  ];
}

export function isRegistrationPasswordValid(password: string): boolean {
  return passwordRequirements(password).every((item) => item.valid);
}
