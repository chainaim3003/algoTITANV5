// src/config/security-config.ts
// Security Configuration Constants
// SAFE MUTUAL AUTH - Security parameters

export const SECURITY_CONFIG = {
  // Nonce settings
  NONCE_MAX_AGE_MS: 300000,           // 5 minutes for nonce validity
  NONCE_CLEANUP_INTERVAL_MS: 600000,  // 10 minutes cleanup interval
  
  // Session settings
  SESSION_TOKEN_EXPIRY_MS: 3600000,   // 1 hour session duration
  SESSION_MAX_LIFETIME_MS: 7200000,   // 2 hours absolute maximum
  SESSION_SLIDING_WINDOW: true,        // Extend session on activity
  
  // Signature settings
  SIGNATURE_ALGORITHM: 'Ed25519',      // KERIA default algorithm
  
  // Challenge settings for authentication
  CHALLENGE_LENGTH: 32,                // 32 bytes for challenge strings
  
  // Timestamp validation
  TIMESTAMP_MAX_AGE_MINUTES: 5,        // Messages older than 5 minutes rejected
  TIMESTAMP_CLOCK_SKEW_MS: 60000,      // Allow 1 minute clock skew
  
  // KERIA API settings
  KERIA_DEFAULT_URL: 'http://localhost:3902',
  KERIA_REQUEST_TIMEOUT_MS: 30000,     // 30 seconds
  
  // Verification settings
  ENABLE_SIGNATURE_VERIFICATION: true,  // Always verify signatures
  ENABLE_NONCE_VALIDATION: true,        // Always validate nonces
  ENABLE_SESSION_VALIDATION: false,     // Optional session tokens
  
  // Retry settings for network operations
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 1000,
} as const;

// Export type for configuration
export type SecurityConfig = typeof SECURITY_CONFIG;

// Helper to validate configuration at startup
export function validateSecurityConfig(): void {
  console.log('[Security] Validating security configuration...');
  
  if (SECURITY_CONFIG.NONCE_MAX_AGE_MS < 60000) {
    console.warn('[Security] ⚠️  Nonce max age is very short (< 1 minute)');
  }
  
  if (SECURITY_CONFIG.SESSION_TOKEN_EXPIRY_MS < 300000) {
    console.warn('[Security] ⚠️  Session expiry is very short (< 5 minutes)');
  }
  
  if (!SECURITY_CONFIG.ENABLE_SIGNATURE_VERIFICATION) {
    console.error('[Security] ❌ CRITICAL: Signature verification is DISABLED!');
    throw new Error('Signature verification cannot be disabled in SAFE MUTUAL AUTH');
  }
  
  if (!SECURITY_CONFIG.ENABLE_NONCE_VALIDATION) {
    console.warn('[Security] ⚠️  WARNING: Nonce validation is DISABLED - replay attacks possible');
  }
  
  console.log('[Security] ✅ Configuration validated');
  console.log(`[Security]    - Signature verification: ${SECURITY_CONFIG.ENABLE_SIGNATURE_VERIFICATION ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Security]    - Nonce validation: ${SECURITY_CONFIG.ENABLE_NONCE_VALIDATION ? 'ENABLED' : 'DISABLED'}`);
  console.log(`[Security]    - Session validation: ${SECURITY_CONFIG.ENABLE_SESSION_VALIDATION ? 'ENABLED' : 'DISABLED'}`);
}
