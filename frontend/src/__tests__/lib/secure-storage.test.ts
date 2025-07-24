import {
  secureStorage,
  setTokens,
  getTokens,
  hasValidTokens,
  isTokenExpired,
  clearTokens,
} from '../../lib/secure-storage';

// Mock sessionStorage
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock document.cookie
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: '',
});

describe('SecureStorage', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    document.cookie = '';
    Object.defineProperty(window, 'sessionStorage', {
      value: mockSessionStorage,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should store tokens in sessionStorage in development', () => {
      const token = 'test-token';
      const refreshToken = 'test-refresh-token';
      const expiresIn = 3600000; // 1 hour

      setTokens(token, refreshToken, expiresIn);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'carpool_token',
        token
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'carpool_refresh_token',
        refreshToken
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'carpool_token_expires',
        expect.stringMatching(/^\d+$/)
      );
    });

    it('should use default expiration time when not specified', () => {
      const token = 'test-token';
      const refreshToken = 'test-refresh-token';

      setTokens(token, refreshToken);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'carpool_token_expires',
        expect.stringMatching(/^\d+$/)
      );
    });
  });

  describe('getTokens', () => {
    it('should retrieve valid tokens from sessionStorage', () => {
      const token = 'test-token';
      const refreshToken = 'test-refresh-token';
      const futureExpiry = (Date.now() + 3600000).toString(); // 1 hour from now

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return token;
          case 'carpool_refresh_token':
            return refreshToken;
          case 'carpool_token_expires':
            return futureExpiry;
          default:
            return null;
        }
      });

      const result = getTokens();

      expect(result).toEqual({
        token,
        refreshToken,
        expiresAt: parseInt(futureExpiry, 10),
      });
    });

    it('should return null when tokens are missing', () => {
      mockSessionStorage.getItem.mockReturnValue(null);

      const result = getTokens();

      expect(result).toBeNull();
    });

    it('should return null and clear tokens when expired', () => {
      const token = 'test-token';
      const refreshToken = 'test-refresh-token';
      const pastExpiry = (Date.now() - 1000).toString(); // 1 second ago

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return token;
          case 'carpool_refresh_token':
            return refreshToken;
          case 'carpool_token_expires':
            return pastExpiry;
          default:
            return null;
        }
      });

      const result = getTokens();

      expect(result).toBeNull();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_token'
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_refresh_token'
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_token_expires'
      );
    });

    it('should handle storage errors gracefully', () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = getTokens();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to retrieve tokens:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('hasValidTokens', () => {
    it('should return true for valid tokens', () => {
      const futureExpiry = (Date.now() + 3600000).toString();

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return 'token';
          case 'carpool_refresh_token':
            return 'refresh';
          case 'carpool_token_expires':
            return futureExpiry;
          default:
            return null;
        }
      });

      expect(hasValidTokens()).toBe(true);
    });

    it('should return false for expired tokens', () => {
      const pastExpiry = (Date.now() - 1000).toString();

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return 'token';
          case 'carpool_refresh_token':
            return 'refresh';
          case 'carpool_token_expires':
            return pastExpiry;
          default:
            return null;
        }
      });

      expect(hasValidTokens()).toBe(false);
    });

    it('should return false when tokens are missing', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(hasValidTokens()).toBe(false);
    });
  });

  describe('clearTokens', () => {
    it('should remove all tokens from sessionStorage in development', () => {
      clearTokens();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_token'
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_refresh_token'
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'carpool_token_expires'
      );
    });
  });

  describe('isTokenExpired', () => {
    it('should return true for expired tokens', () => {
      const pastExpiry = (Date.now() - 1000).toString();

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return 'token';
          case 'carpool_refresh_token':
            return 'refresh';
          case 'carpool_token_expires':
            return pastExpiry;
          default:
            return null;
        }
      });

      expect(isTokenExpired()).toBe(true);
    });

    it('should return false for valid tokens', () => {
      const futureExpiry = (Date.now() + 3600000).toString();

      mockSessionStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'carpool_token':
            return 'token';
          case 'carpool_refresh_token':
            return 'refresh';
          case 'carpool_token_expires':
            return futureExpiry;
          default:
            return null;
        }
      });

      expect(isTokenExpired()).toBe(false);
    });

    it('should return true when no tokens exist', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(isTokenExpired()).toBe(true);
    });
  });
});
