/**
 * API Manager - Handles rate limiting, fallback logic, and API health tracking
 * Implements a layered fallback system for resilience
 */

export interface ApiStatus {
  name: string;
  isHealthy: boolean;
  lastError?: string;
  lastSuccess?: number;
  consecutiveFailures: number;
  rateLimitRemaining?: number;
  rateLimitReset?: number;
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

      // Mark as unhealthy if too many failures
      if (status.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        status.isHealthy = false;
        console.warn(`API ${apiName} marked as unhealthy after ${status.consecutiveFailures} failures`);
      }
    }
  }

  /**
   * Check if an API is available (healthy and not rate limited)
   */
  isApiAvailable(apiName: string): boolean {
    const status = this.apiStatuses.get(apiName);
    if (!status) return false;

    // Check if unhealthy
    if (!status.isHealthy) {
      // Try to recover after health check interval
      if (status.lastSuccess && Date.now() - status.lastSuccess > this.HEALTH_CHECK_INTERVAL) {
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
   * Reset an API's health status (manual recovery)
   */
  resetApi(apiName: string): void {
    const status = this.apiStatuses.get(apiName);
    if (status) {
      status.isHealthy = true;
      status.consecutiveFailures = 0;
      status.lastError = undefined;
    }
  }
}

export const apiManager = new ApiManager();

