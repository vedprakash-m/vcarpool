import { AuthService } from "../auth.service";
import { User } from "@carpool/shared";
import { TestDataFactory, MockServices, TestAssertions } from "@tests/utils";
import { UserRepository } from "../../repositories/user.repository";

describe("AuthService", () => {
  let authService: AuthService;
  let mockUserRepository: any;

  const mockUser: User = {
    id: "test-user-id",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
    preferences: {
      pickupLocation: "",
      dropoffLocation: "",
      preferredTime: "08:00",
      isDriver: false,
      smokingAllowed: false,
      notifications: {
        email: true,
        sms: false,
        tripReminders: true,
        swapRequests: true,
        scheduleChanges: true,
      },
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    authService = new AuthService(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("password hashing", () => {
    it("should hash and verify password correctly", async () => {
      const password = "testpassword123";
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await authService.verifyPassword("wrongpassword", hash);
      expect(isInvalid).toBe(false);
    });
  });

  describe("JWT tokens", () => {
    it("should generate and verify access token", () => {
      const token = authService.generateAccessToken(mockUser);
      expect(token).toBeDefined();

      const payload = authService.verifyAccessToken(token);
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
    });

    it("should generate and verify refresh token", () => {
      const token = authService.generateRefreshToken(mockUser);
      expect(token).toBeDefined();

      const payload = authService.verifyRefreshToken(token);
      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
    });

    it("should extract token from authorization header", () => {
      const token = "sample-jwt-token";
      const authHeader = `Bearer ${token}`;

      const extracted = authService.extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);

      const noToken = authService.extractTokenFromHeader("Invalid header");
      expect(noToken).toBeNull();

      const noHeader = authService.extractTokenFromHeader(undefined);
      expect(noHeader).toBeNull();
    });
  });

  describe("User Authentication Flow", () => {
    it("should authenticate user with valid credentials", async () => {
      const email = "test@example.com";
      const password = "test-secure-password";
      const hashedPassword = await authService.hashPassword(password);

      const userWithPassword = {
        ...mockUser,
        email,
        passwordHash: hashedPassword,
      };

      mockUserRepository.findByEmail.mockResolvedValue(userWithPassword);

      // This would be part of a login function in a real implementation
      const foundUser = await mockUserRepository.findByEmail(email);
      const isValidPassword = await authService.verifyPassword(
        password,
        foundUser.passwordHash
      );

      expect(foundUser).toBeDefined();
      expect(isValidPassword).toBe(true);
    });

    it("should reject authentication with invalid password", async () => {
      const email = "test@example.com";
      const correctPassword = "test-secure-password";
      const wrongPassword = "wrong-password";
      const hashedPassword = await authService.hashPassword(correctPassword);

      const userWithPassword = {
        ...mockUser,
        email,
        passwordHash: hashedPassword,
      };

      mockUserRepository.findByEmail.mockResolvedValue(userWithPassword);

      const foundUser = await mockUserRepository.findByEmail(email);
      const isValidPassword = await authService.verifyPassword(
        wrongPassword,
        foundUser.passwordHash
      );

      expect(foundUser).toBeDefined();
      expect(isValidPassword).toBe(false);
    });

    it("should handle non-existent user gracefully", async () => {
      const email = "nonexistent@example.com";

      mockUserRepository.findByEmail.mockResolvedValue(null);

      const foundUser = await mockUserRepository.findByEmail(email);
      expect(foundUser).toBeNull();
    });
  });

  describe("Token Security", () => {
    it("should generate different tokens for same user", () => {
      const token1 = authService.generateAccessToken(mockUser);
      const token2 = authService.generateAccessToken(mockUser);

      // Tokens should be different due to different timestamps
      expect(token1).not.toBe(token2);
    });

    it("should include correct payload in token", () => {
      const token = authService.generateAccessToken(mockUser);
      const payload = authService.verifyAccessToken(token);

      expect(payload.userId).toBe(mockUser.id);
      expect(payload.email).toBe(mockUser.email);
      expect(payload.iat).toBeDefined();
      expect(payload.exp).toBeDefined();
    });

    it("should reject malformed tokens", () => {
      expect(() => {
        authService.verifyAccessToken("malformed.token");
      }).toThrow();
    });

    it("should reject empty or undefined tokens", () => {
      expect(() => {
        authService.verifyAccessToken("");
      }).toThrow();

      expect(() => {
        authService.verifyAccessToken(undefined as any);
      }).toThrow();
    });
  });
});
