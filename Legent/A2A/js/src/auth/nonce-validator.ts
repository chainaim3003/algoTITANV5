// src/auth/nonce-validator.ts
// Nonce Validation - Prevents replay attacks
// MODEL B: Always validated on every message

/**
 * NonceValidator - Tracks used nonces to prevent replay attacks
 * Each nonce can only be used once within a 10-minute window
 * MODEL B: Critical layer - prevents exact message replay
 */
class NonceValidator {
  private usedNonces = new Set<string>();
  private CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Validate a nonce (must be unique)
   * @param nonce - Unique identifier (usually UUID)
   * @returns true if nonce is valid (not used before)
   */
  validate(nonce: string): boolean {
    if (!nonce || typeof nonce !== 'string') {
      console.error(`[Nonce] ❌ Invalid nonce format`);
      return false;
    }

    if (this.usedNonces.has(nonce)) {
      console.error(`[Nonce] ❌ REPLAY ATTACK DETECTED! Nonce already used: ${nonce.substring(0, 8)}...`);
      return false;
    }

    // Mark as used
    this.usedNonces.add(nonce);
    console.log(`[Nonce] ✅ Nonce valid: ${nonce.substring(0, 8)}...`);

    // Auto-cleanup after interval to prevent memory leak
    setTimeout(() => {
      this.usedNonces.delete(nonce);
    }, this.CLEANUP_INTERVAL_MS);

    return true;
  }

  /**
   * Get current number of tracked nonces
   */
  getTrackedCount(): number {
    return this.usedNonces.size;
  }

  /**
   * Clear all tracked nonces (for testing)
   */
  clear(): void {
    this.usedNonces.clear();
    console.log(`[Nonce] Cleared all tracked nonces`);
  }
}

// Singleton instance
export const nonceValidator = new NonceValidator();
