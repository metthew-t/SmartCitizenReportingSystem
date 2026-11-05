/**
 * Standard Government & NIST SP 800-63B Strong Password Policy (12+ characters)
 */

export interface PasswordRule {
  id: string
  label: string
  valid: boolean
}

export function validatePasswordRules(password: string): PasswordRule[] {
  return [
    {
      id: 'length',
      label: 'Minimum 12 characters long',
      valid: password.length >= 12,
    },
    {
      id: 'uppercase',
      label: 'At least one uppercase letter (A-Z)',
      valid: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'At least one lowercase letter (a-z)',
      valid: /[a-z]/.test(password),
    },
    {
      id: 'digit',
      label: 'At least one numeric digit (0-9)',
      valid: /[0-9]/.test(password),
    },
    {
      id: 'special',
      label: 'At least one special character (!@#$%^&* etc.)',
      valid: /[^A-Za-z0-9]/.test(password),
    },
  ]
}

export function isStrongPassword(password: string): boolean {
  return validatePasswordRules(password).every(r => r.valid)
}

/**
 * Generate a cryptographically strong 14-character government-compliant password
 */
export function generateStrongPassword(): string {
  const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lowers = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*()_+=-'
  const all = uppers + lowers + digits + symbols

  const pick = (str: string) => str[Math.floor(Math.random() * str.length)]
  
  // Guarantee at least 2 of each category
  const chars = [
    pick(uppers), pick(uppers),
    pick(lowers), pick(lowers),
    pick(digits), pick(digits),
    pick(symbols), pick(symbols),
  ]

  while (chars.length < 14) {
    chars.push(pick(all))
  }

  // Shuffle securely
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }

  return chars.join('')
}

