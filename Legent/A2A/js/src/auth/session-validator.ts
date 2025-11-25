// src/auth/session-validator.ts
// Session Token Management - Tracks authenticated sessions
// MODEL B: Session provides workflow continuity but does NOT replace crypto checks

interface SessionData {
  sessionToken: string;
  agentAID: string;
  agentName: string;
  role: 'buyer' | 'seller';
  createdAt: number;
  lastUsedAt: number;
  expiresAt: number;
}

/**
 * SessionValidator - Manages session tokens for authenticated agents
 * MODEL B: Session token provides workflow continuity but does NOT replace crypto checks
 * Every message is still fully verified (signature + delegation) even with valid session
 */
class SessionValidator {
  private sessions = new Map<string, SessionData>();
  private enabled = false;

  // Configuration
  private SESSION_DURATION_MS = 30 * 60 * 1000;           // 30 min inactivity
  private MAX_SESSION_LIFETIME_MS = 2 * 60 * 60 * 1000;   // 2 hours absolute
  private SLIDING_WINDOW = true;                           // Extend on use
  private CLEANUP_INTERVAL_MS = 5 * 60 * 1000;            // Cleanup every 5 min

  constructor() {
    // Periodic cleanup of expired sessions
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Enable session validation
   */
  enable(): void {
    this.enabled = true;
    console.log('[Session] ✅ Session validation ENABLED (Model B: Maximum Security)');
    console.log('[Session]    Note: Session validates workflow, crypto checks still required');
  }

  /**
   * Disable session validation
   */
  disable(): void {
    this.enabled = false;
    console.log('[Session] ⚠️  Session validation DISABLED');
  }

  /**
   * Check if session validation is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Create a new session for an authenticated agent
   * @param agentAID - Agent's public AID
   * @param agentName - Agent's name
   * @param role - Agent's role (buyer/seller)
   * @returns Session token
   */
  create(agentAID: string, agentName: string, role: 'buyer' | 'seller'): string {
    if (!this.enabled) {
      console.log('[Session] ⚠️  Session creation skipped (disabled)');
      return '';
    }

    const sessionToken = this.generateSessionToken();
    const now = Date.now();

    const sessionData: SessionData = {
      sessionToken,
      agentAID,
      agentName,
      role,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + this.SESSION_DURATION_MS
    };

    this.sessions.set(sessionToken, sessionData);

    console.log(`[Session] ✅ Session created for ${agentName} (${role})`);
    console.log(`[Session]    Token: ${sessionToken.substring(0, 12)}...`);
    console.log(`[Session]    Expires: ${new Date(sessionData.expiresAt).toISOString()}`);
    console.log(`[Session]    Duration: 30 min sliding window, 2 hr max`);

    return sessionToken;
  }

  /**
   * Validate a session token
   * MODEL B: This validates workflow continuity, but crypto checks still required!
   * @param sessionToken - Session token to validate
   * @param agentAID - Expected agent AID
   * @returns true if session is valid
   */
  validate(sessionToken: string, agentAID: string): boolean {
    if (!this.enabled) {
      console.log('[Session] ⚠️  Session validation skipped (disabled)');
      return true; // Pass validation if disabled
    }

    if (!sessionToken) {
      console.error('[Session] ❌ No session token provided');
      return false;
    }

    const session = this.sessions.get(sessionToken);

    if (!session) {
      console.error(`[Session] ❌ Invalid session token: ${sessionToken.substring(0, 12)}...`);
      return false;
    }

    // Validate AID matches
    if (session.agentAID !== agentAID) {
      console.error(`[Session] ❌ Session AID mismatch!`);
      console.error(`[Session]    Expected: ${agentAID.substring(0, 12)}...`);
      console.error(`[Session]    Session: ${session.agentAID.substring(0, 12)}...`);
      return false;
    }

    const now = Date.now();

    // Check absolute max lifetime
    if (now > session.createdAt + this.MAX_SESSION_LIFETIME_MS) {
      console.error(`[Session] ❌ Session exceeded maximum lifetime (2 hours)`);
      this.sessions.delete(sessionToken);
      return false;
    }

    // Check sliding window expiration
    if (now > session.expiresAt) {
      const expiredBy = Math.floor((now - session.expiresAt) / 1000);
      console.error(`[Session] ❌ Session expired (${expiredBy}s ago)`);
      this.sessions.delete(sessionToken);
      return false;
    }

    // Update last used time and extend expiration (sliding window)
    if (this.SLIDING_WINDOW) {
      session.lastUsedAt = now;
      session.expiresAt = now + this.SESSION_DURATION_MS;
    }

    const ageMinutes = Math.floor((now - session.createdAt) / 60000);
    const expiresMinutes = Math.floor((session.expiresAt - now) / 60000);

    console.log(`[Session] ✅ Session valid for ${session.agentName}`);
    console.log(`[Session]    Age: ${ageMinutes} minutes`);
    console.log(`[Session]    Expires in: ${expiresMinutes} minutes`);

    return true;
  }

  /**
   * Invalidate a session (logout)
   */
  invalidate(sessionToken: string): void {
    if (this.sessions.delete(sessionToken)) {
      console.log(`[Session] Session invalidated: ${sessionToken.substring(0, 12)}...`);
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [token, session] of this.sessions.entries()) {
      if (now > session.expiresAt || now > session.createdAt + this.MAX_SESSION_LIFETIME_MS) {
        this.sessions.delete(token);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Session] 🧹 Cleaned up ${cleanedCount} expired sessions`);
    }
  }

  /**
   * Generate a session token
   */
  private generateSessionToken(): string {
    // Generate a random session token
    return `SESSION-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get time remaining for a session (in milliseconds)
   */
  getTimeRemaining(sessionToken: string): number {
    const session = this.sessions.get(sessionToken);
    if (!session) return 0;
    return Math.max(0, session.expiresAt - Date.now());
  }
}

// Singleton instance
export const sessionValidator = new SessionValidator();
