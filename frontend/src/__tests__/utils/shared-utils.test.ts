/**
 * Tests for shared utility functions
 * Testing date, validation, format, and async utilities
 */

import {
  dateUtils,
  validationUtils,
  formatUtils,
  stringUtils,
  asyncUtils,
} from '@carpool/shared';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-12-25T10:30:00');
      expect(dateUtils.formatDate(date)).toBe('2024-12-25');
    });

    it('should handle different time zones consistently', () => {
      const date = new Date('2024-01-01T23:59:59Z');
      const formatted = dateUtils.formatDate(date);
      expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('parseDate', () => {
    it('should parse date string correctly', () => {
      const dateString = '2024-12-25T00:00:00.000Z';
      const parsed = dateUtils.parseDate(dateString);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getUTCFullYear()).toBe(2024);
      expect(parsed.getUTCMonth()).toBe(11); // 0-indexed
      expect(parsed.getUTCDate()).toBe(25);
    });

    it('should handle ISO date strings', () => {
      const isoString = '2024-12-25T10:30:00.000Z';
      const parsed = dateUtils.parseDate(isoString);
      expect(parsed.toISOString()).toBe(isoString);
    });
  });

  describe('isToday', () => {
    it('should return true for today', () => {
      const today = new Date();
      expect(dateUtils.isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(dateUtils.isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(dateUtils.isToday(tomorrow)).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(dateUtils.isFuture(future)).toBe(true);
    });

    it('should return false for past dates', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(dateUtils.isFuture(past)).toBe(false);
    });

    it('should return false for current time (approximately)', () => {
      const now = new Date();
      expect(dateUtils.isFuture(now)).toBe(false);
    });
  });

  describe('getDayOfWeek', () => {
    it('should return correct day of week', () => {
      // Sunday, December 24, 2023 (known to be a Sunday)
      const sunday = new Date('2023-12-24T12:00:00.000Z');
      expect(dateUtils.getDayOfWeek(sunday)).toBe(0);

      // Monday, December 25, 2023
      const monday = new Date('2023-12-25T12:00:00.000Z');
      expect(dateUtils.getDayOfWeek(monday)).toBe(1);

      // Saturday, December 30, 2023
      const saturday = new Date('2023-12-30T12:00:00.000Z');
      expect(dateUtils.getDayOfWeek(saturday)).toBe(6);
    });
  });

  describe('addDays', () => {
    it('should add days correctly', () => {
      const date = new Date('2024-01-01');
      const result = dateUtils.addDays(date, 5);
      expect(dateUtils.formatDate(result)).toBe('2024-01-06');
    });

    it('should handle negative days (subtract)', () => {
      const date = new Date('2024-01-10');
      const result = dateUtils.addDays(date, -3);
      expect(dateUtils.formatDate(result)).toBe('2024-01-07');
    });

    it('should not modify original date', () => {
      const original = new Date('2024-01-01');
      const originalTime = original.getTime();
      dateUtils.addDays(original, 5);
      expect(original.getTime()).toBe(originalTime);
    });
  });
});

describe('validationUtils', () => {
  describe('isValidEmail', () => {
    it('should validate correct email addresses', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        'user123@test-domain.com',
      ];

      validEmails.forEach(email => {
        expect(validationUtils.isValidEmail(email)).toBe(true);
      });
    });

    it('should reject invalid email addresses', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        expect(validationUtils.isValidEmail(email)).toBe(false);
      });
    });
  });

  describe('isValidPhone', () => {
    it('should validate correct phone numbers', () => {
      const validPhones = [
        '+1234567890',
        '(555) 123-4567',
        '555-123-4567',
        '555 123 4567',
        '+44 20 7946 0958',
      ];

      validPhones.forEach(phone => {
        expect(validationUtils.isValidPhone(phone)).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123', 'abc-def-ghij', '555-abc-1234', ''];

      invalidPhones.forEach(phone => {
        expect(validationUtils.isValidPhone(phone)).toBe(false);
      });
    });
  });

  describe('isValidTime', () => {
    it('should validate correct time formats', () => {
      const validTimes = ['09:00', '23:59', '00:00', '12:30', '1:05', '01:05'];

      validTimes.forEach(time => {
        expect(validationUtils.isValidTime(time)).toBe(true);
      });
    });

    it('should reject invalid time formats', () => {
      const invalidTimes = [
        '25:00',
        '12:60',
        '9:5',
        'abc:def',
        '12:5a',
        '24:00',
      ];

      invalidTimes.forEach(time => {
        expect(validationUtils.isValidTime(time)).toBe(false);
      });
    });
  });
});

describe('formatUtils', () => {
  describe('currency', () => {
    it('should format currency correctly', () => {
      expect(formatUtils.currency(15.5)).toBe('$15.50');
      expect(formatUtils.currency(100)).toBe('$100.00');
      expect(formatUtils.currency(0)).toBe('$0.00');
    });

    it('should handle different currencies', () => {
      expect(formatUtils.currency(15.5, 'EUR')).toContain('15.50');
      expect(formatUtils.currency(15.5, 'GBP')).toContain('15.50');
    });

    it('should handle large amounts', () => {
      expect(formatUtils.currency(1234567.89)).toBe('$1,234,567.89');
    });
  });

  describe('distance', () => {
    it('should format meters correctly', () => {
      expect(formatUtils.distance(500)).toBe('500m');
      expect(formatUtils.distance(999)).toBe('999m');
    });

    it('should format kilometers correctly', () => {
      expect(formatUtils.distance(1000)).toBe('1.0km');
      expect(formatUtils.distance(1500)).toBe('1.5km');
      expect(formatUtils.distance(12345)).toBe('12.3km');
    });

    it('should handle zero distance', () => {
      expect(formatUtils.distance(0)).toBe('0m');
    });
  });

  describe('duration', () => {
    it('should format minutes only', () => {
      expect(formatUtils.duration(30)).toBe('30m');
      expect(formatUtils.duration(5)).toBe('5m');
    });

    it('should format hours and minutes', () => {
      expect(formatUtils.duration(60)).toBe('1h 0m');
      expect(formatUtils.duration(90)).toBe('1h 30m');
      expect(formatUtils.duration(125)).toBe('2h 5m');
    });

    it('should handle zero duration', () => {
      expect(formatUtils.duration(0)).toBe('0m');
    });
  });
});

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('should capitalize first letter', () => {
      expect(stringUtils.capitalize('hello')).toBe('Hello');
      expect(stringUtils.capitalize('WORLD')).toBe('World');
      expect(stringUtils.capitalize('test string')).toBe('Test string');
    });

    it('should handle empty strings', () => {
      expect(stringUtils.capitalize('')).toBe('');
    });

    it('should handle single character', () => {
      expect(stringUtils.capitalize('a')).toBe('A');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      const longString = 'This is a very long string that should be truncated';
      expect(stringUtils.truncate(longString, 20)).toBe('This is a very lo...');
    });

    it('should not truncate short strings', () => {
      const shortString = 'Short';
      expect(stringUtils.truncate(shortString, 20)).toBe('Short');
    });

    it('should handle exact length', () => {
      const exactString = '12345';
      expect(stringUtils.truncate(exactString, 5)).toBe('12345');
    });

    it('should handle very short max length', () => {
      expect(stringUtils.truncate('Hello', 3)).toBe('...');
    });
  });
});

describe('asyncUtils', () => {
  describe('sleep', () => {
    it('should sleep for specified time', async () => {
      const start = Date.now();
      await asyncUtils.sleep(100);
      const end = Date.now();

      // Allow more tolerance for timing (CI and busy environments)
      expect(end - start).toBeGreaterThanOrEqual(80);
      expect(end - start).toBeLessThan(250);
    });

    it('should resolve with undefined', async () => {
      const result = await asyncUtils.sleep(10);
      expect(result).toBeUndefined();
    });
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const result = await asyncUtils.retry(mockFn, 3, 100);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');

      const result = await asyncUtils.retry(mockFn, 3, 10); // Small delay for fast test

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const error = new Error('Always fails');
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(asyncUtils.retry(mockFn, 2, 10)).rejects.toThrow(
        'Always fails'
      );
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle synchronous functions that return promises', async () => {
      const mockFn = jest.fn(() => Promise.resolve('sync result'));

      const result = await asyncUtils.retry(mockFn, 3, 100);

      expect(result).toBe('sync result');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});
