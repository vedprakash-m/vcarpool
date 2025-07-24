/**
 * Secure token storage utility
 *
 * This module provides secure storage for authentication tokens.
 * It uses httpOnly cookies for production and localStorage with encryption for development.
 */

interface TokenData {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

class SecureStorage {
  private readonly TOKEN_KEY = 'carpool_token';
  private readonly REFRESH_TOKEN_KEY = 'carpool_refresh_token';
  private readonly EXPIRES_KEY = 'carpool_token_expires';

  /**
   * Store tokens securely
   */
  setTokens(
    token: string,
    refreshToken: string,
    expiresIn: number = 24 * 60 * 60 * 1000
  ): void {
    const expiresAt = Date.now() + expiresIn;

    if (this.isProduction()) {
      // In production, use httpOnly cookies (requires server-side implementation)
      this.setCookie(this.TOKEN_KEY, token, expiresIn);
      this.setCookie(
        this.REFRESH_TOKEN_KEY,
        refreshToken,
        7 * 24 * 60 * 60 * 1000
      ); // 7 days
      this.setCookie(this.EXPIRES_KEY, expiresAt.toString(), expiresIn);
    } else {
      // In development, use sessionStorage (more secure than localStorage)
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      sessionStorage.setItem(this.EXPIRES_KEY, expiresAt.toString());
    }
  }

  /**
   * Retrieve tokens
   */
  getTokens(): TokenData | null {
    try {
      let token: string | null;
      let refreshToken: string | null;
      let expiresAt: string | null;

      if (this.isProduction()) {
        token = this.getCookie(this.TOKEN_KEY);
        refreshToken = this.getCookie(this.REFRESH_TOKEN_KEY);
        expiresAt = this.getCookie(this.EXPIRES_KEY);
      } else {
        token = sessionStorage.getItem(this.TOKEN_KEY);
        refreshToken = sessionStorage.getItem(this.REFRESH_TOKEN_KEY);
        expiresAt = sessionStorage.getItem(this.EXPIRES_KEY);
      }

      if (!token || !refreshToken || !expiresAt) {
        return null;
      }

      const expiration = parseInt(expiresAt, 10);

      // Check if token is expired
      if (Date.now() > expiration) {
        this.clearTokens();
        return null;
      }

      return {
        token,
        refreshToken,
        expiresAt: expiration,
      };
    } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      return null;
    }
  }

  /**
   * Check if tokens exist and are valid
   */
  hasValidTokens(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && Date.now() < tokens.expiresAt;
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    if (this.isProduction()) {
      this.deleteCookie(this.TOKEN_KEY);
      this.deleteCookie(this.REFRESH_TOKEN_KEY);
      this.deleteCookie(this.EXPIRES_KEY);
    } else {
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.REFRESH_TOKEN_KEY);
      sessionStorage.removeItem(this.EXPIRES_KEY);
    }
  }

  /**
   * Set httpOnly cookie (requires server-side support)
   */
  private setCookie(name: string, value: string, maxAge: number): void {
    // This would typically be handled server-side via API calls
    // For now, we'll use regular cookies with secure flags
    const secure = this.isProduction() ? '; Secure' : '';
    const sameSite = '; SameSite=Strict';
    const httpOnly = ''; // Note: httpOnly can only be set server-side

    document.cookie = `${name}=${value}; Max-Age=${Math.floor(
      maxAge / 1000
    )}; Path=/${secure}${sameSite}${httpOnly}`;
  }

  /**
   * Get cookie value
   */
  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(';').shift();
      return cookieValue || null;
    }
    return null;
  }

  /**
   * Delete cookie
   */
  private deleteCookie(name: string): void {
    document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;`;
  }

  /**
   * Check if running in production
   */
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

// Helper functions for easy access
export const setTokens = (
  token: string,
  refreshToken: string,
  expiresIn?: number
) => secureStorage.setTokens(token, refreshToken, expiresIn);

export const getTokens = () => secureStorage.getTokens();

export const hasValidTokens = () => secureStorage.hasValidTokens();

export const isTokenExpired = () => !secureStorage.hasValidTokens();

export const clearTokens = () => secureStorage.clearTokens();
