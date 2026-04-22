/**
 * API Manager - Handles rate limiting, fallback logic, and API health tracking
 * Implements a layered fallback system for resilience
 */

export interface ApiStatus {
  name: string;
  isHealthy: boolean;
  lastError?: string;
  lastSuccess?: number;
  lastFailure?: number;
  consecutiveFailures: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
  /** Permanently disabled (e.g. missing API key). Does NOT auto-recover. */
  disabled?: boolean;
}

export class ApiManager {
  private apiStatuses: Map<string, ApiStatus>;
  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly HEALTH_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.apiStatuses = new Map();
  }

  /**
   * Register an API with the manager
   */
  registerApi(name: string): void {
    if (!this.apiStatuses.has(name)) {
      this.apiStatuses.set(name, {
        name,
        isHealthy: true,
        consecutiveFailures: 0,
      });
    }
  }

  /**
   * Record a successful API call
   */
  recordSuccess(apiName: string, rateLimitRemaining?: number, rateLimitReset?: number): void {
    const status = this.apiStatuses.get(apiName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.lastSuccess = Date.now();
      if (rateLimitRemaining !== undefined) {
        status.rateLimitRemaining = rateLimitRemaining;
      }
      if (rateLimitReset !== undefined) {
        status.rateLimitReset = rateLimitReset;
      }
    }
  }

  /**
   * Record a failed API call
   */
  recordFailure(apiName: string, error: string): void {
    const status = this.apiStatuses.get(apiName);
    if (status) {
      status.consecutiveFailures += 1;
      status.lastError = error;
      status.lastFailure = Date.now();

      // Mark as unhealthy if too many failures
      if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        status.isHealthy = false;
        console.warn(`API ${apiName} marked as unhealthy after ${status.consecutiveFailures} failures`);
      }
    }
  }

  /**
   * Permanently disable a provider (e.g. missing API key). Skipped by
   * isApiAvailable until resetApi is explicitly called.
   */
  markUnavailable(apiName: string, reason: string): void {
    this.registerApi(apiName);
    const status = this.apiStatuses.get(apiName)!;
    status.disabled = true;
    status.isHealthy = false;
    status.lastError = reason;
  }

  /**
   * Check if an API is available (healthy and not rate limited)
   */
  isApiAvailable(apiName: string): boolean {
    const status = this.apiStatuses.get(apiName);
    if (!status) return false;
    if (status.disabled) return false;

    // Check if unhealthy
    if (!status.isHealthy) {
      // Probe again after the health-check interval. We use the most recent
      // failure (or last success, whichever is later) as the cooldown anchor
      // so that an API which has *never* succeeded still gets retried
      // periodically rather than being permanently shunned.
      const anchor = Math.max(status.lastFailure ?? 0, status.lastSuccess ?? 0);
      if (anchor === 0 || Date.now() - anchor > this.HEALTH_CHECK_INTERVAL) {
        status.isHealthy = true;
        status.consecutiveFailures = 0;
        return true;
      }
      return false;
    }

    // Check rate limit
    if (status.rateLimitRemaining !== undefined && status.rateLimitRemaining <= 0) {
      if (status.rateLimitReset && Date.now() < status.rateLimitReset) {
        return false; // Still rate limited
      }
      // Reset time has passed, assume limit reset
      status.rateLimitRemaining = undefined;
    }

    return true;
  }

  /**
   * Get available APIs in priority order
   */
  getAvailableApis(priorityOrder: string[]): string[] {
    return priorityOrder.filter((api) => this.isApiAvailable(api));
  }

  /**
   * Get API status for monitoring
   */
  getApiStatus(apiName: string): ApiStatus | undefined {
    return this.apiStatuses.get(apiName);
  }

  /**
   * Get all API statuses
   */
  getAllStatuses(): ApiStatus[] {
    return Array.from(this.apiStatuses.values());
  }

  /**
   * Reset an API's health status (manual recovery). Also clears a
   * permanent disable so operators can re-enable a provider after
   * setting its key without restarting.
   */
  resetApi(apiName: string): void {
    const status = this.apiStatuses.get(apiName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.lastError = undefined;
      status.disabled = false;
    }
  }
}

export const apiManager = new ApiManager();

