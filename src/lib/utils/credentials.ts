/**
 * Secure credential management utilities.
 * Prevents accidental exposure of sensitive data in logs, JSON serialization, and stack traces.
 */

/**
 * A secure wrapper for credential data that prevents accidental exposure.
 *
 * Features:
 * - Prevents JSON serialization of actual credential values
 * - Returns redacted string in toString() for safe logging
 * - Prevents iteration over credential keys in for...in loops
 * - Immutable after creation
 *
 * @example
 * ```ts
 * const creds = new SecureCredentials({ OPENAI_API_KEY: 'sk-...' });
 *
 * // Safe to log - won't expose values
 * console.log(creds); // "[SecureCredentials: 1 credential(s)]"
 * console.log(JSON.stringify(creds)); // '{"_redacted":"[CREDENTIALS REDACTED]","count":1}'
 *
 * // Access values explicitly when needed
 * const apiKey = creds.get('OPENAI_API_KEY');
 *
 * // Check if credential exists
 * if (creds.has('OPENAI_API_KEY')) { ... }
 * ```
 */
export class SecureCredentials {
  private readonly credentials: Map<string, string>;

  constructor(credentials: Record<string, string> = {}) {
    this.credentials = new Map(Object.entries(credentials));
    // Freeze to prevent modification
    Object.freeze(this);
  }

  /**
   * Get a credential value by key.
   * Returns undefined if the key doesn't exist.
   */
  get(key: string): string | undefined {
    return this.credentials.get(key);
  }

  /**
   * Check if a credential exists.
   */
  has(key: string): boolean {
    return this.credentials.has(key);
  }

  /**
   * Get the number of stored credentials.
   */
  get size(): number {
    return this.credentials.size;
  }

  /**
   * Check if any credentials are stored.
   */
  isEmpty(): boolean {
    return this.credentials.size === 0;
  }

  /**
   * Get all credential keys (not values).
   * Safe to log as it only returns key names.
   */
  keys(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Merge with another SecureCredentials instance or plain object.
   * Returns a new SecureCredentials instance (immutable).
   * The provided credentials take precedence over existing ones.
   */
  merge(other: SecureCredentials | Record<string, string>): SecureCredentials {
    const merged: Record<string, string> = {};

    // Copy existing credentials
    for (const key of this.credentials.keys()) {
      const value = this.credentials.get(key);
      if (value !== undefined) {
        merged[key] = value;
      }
    }

    // Overlay new credentials
    if (other instanceof SecureCredentials) {
      for (const key of other.keys()) {
        const value = other.get(key);
        if (value !== undefined) {
          merged[key] = value;
        }
      }
    } else {
      for (const [key, value] of Object.entries(other)) {
        if (value !== undefined) {
          merged[key] = value;
        }
      }
    }

    return new SecureCredentials(merged);
  }

  /**
   * Convert to plain object for internal use only.
   * WARNING: This exposes credential values. Use only when passing to APIs that require plain objects.
   */
  toPlainObject(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const key of this.credentials.keys()) {
      const value = this.credentials.get(key);
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Prevent JSON serialization from exposing credential values.
   */
  toJSON(): { _redacted: string; count: number; keys: string[] } {
    return {
      _redacted: '[CREDENTIALS REDACTED]',
      count: this.credentials.size,
      keys: this.keys(),
    };
  }

  /**
   * Safe string representation for logging.
   */
  toString(): string {
    return `[SecureCredentials: ${this.credentials.size} credential(s)]`;
  }

  /**
   * Custom inspect for Node.js console.log.
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return this.toString();
  }

  /**
   * Static factory to create from environment variables.
   */
  static fromEnvVars(envVars: Record<string, string>): SecureCredentials {
    return new SecureCredentials(envVars);
  }

  /**
   * Static factory to create an empty SecureCredentials instance.
   */
  static empty(): SecureCredentials {
    return new SecureCredentials();
  }
}
