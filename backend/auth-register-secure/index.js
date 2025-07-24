const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const UnifiedResponseHandler = require('../src/utils/unified-response.service');

// In production, this would be a database. For now, using in-memory storage
// that persists across function calls (but not across deployments)
let registeredUsers = [
  // Pre-registered admin users with proper password hashes
  {
    id: 'admin-id',
    email: 'admin@carpool.com',
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewarnQR4nPFzZBGy', // "test-admin-password"
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'ved-admin-id',
    email: 'mi.vedprakash@gmail.com',
    passwordHash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewarnQR4nPFzZBGy', // "test-admin-password"
    firstName: 'Ved',
    lastName: 'Mishra',
    role: 'admin',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

module.exports = async function (context, req) {
  context.log('Secure Registration function triggered');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = UnifiedResponseHandler.preflight();
    return;
  }

  try {
    const { email, password, firstName, lastName, phoneNumber, department } = req.body || {};

    context.log('Registration request for:', email);

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      context.res = UnifiedResponseHandler.validationError(
        'Email, password, first name, and last name are required',
      );
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      context.res = UnifiedResponseHandler.validationError('Invalid email format');
      return;
    }

    // Check for duplicate email
    const existingUser = registeredUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );

    if (existingUser) {
      context.res = UnifiedResponseHandler.validationError(
        'An account with this email address already exists',
      );
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      context.res = UnifiedResponseHandler.validationError(
        'Password must be at least 8 characters long',
      );
      return;
    }

    // Additional password strength validation
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUppercase || !hasLowercase || !hasNumbers) {
      context.res = UnifiedResponseHandler.validationError(
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      );
      return;
    }

    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new user
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      passwordHash: passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'parent', // Default role for new registrations
      phoneNumber: phoneNumber?.trim() || null,
      department: department?.trim() || null,
      homeAddress: null,
      homeAddressVerified: false,
      isActiveDriver: false,
      emailVerified: false, // In production, require email verification
      phoneVerified: false,
      registrationComplete: false,
      preferences: {
        notifications: {
          email: true,
          push: true,
          sms: false,
          tripReminders: true,
          swapRequests: true,
          scheduleChanges: true,
        },
        privacy: {
          showPhoneNumber: true,
          showEmail: false,
        },
        pickupLocation: 'Home',
        dropoffLocation: 'School',
        preferredTime: '08:00',
        isDriver: false,
        smokingAllowed: false,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store the user (in production, save to database)
    registeredUsers.push(newUser);

    // Generate proper JWT tokens using UnifiedAuthService
    const { UnifiedAuthService } = require('../src/services/unified-auth.service');

    // First add the user to the mock users in UnifiedAuthService
    // (In production, this would be handled by database queries)

    // Remove password hash from response
    const { passwordHash: _, ...safeUser } = newUser;

    // Generate tokens
    const accessToken = generateAccessToken(safeUser);
    const refreshToken = generateRefreshToken(safeUser);

    context.log('Registration successful for:', email);
    context.log('User ID:', newUser.id);

    context.res = UnifiedResponseHandler.created({
      user: safeUser,
      token: accessToken,
      refreshToken: refreshToken,
      message: 'Registration successful. Please verify your email address to complete setup.',
    });
  } catch (error) {
    context.log('Registration error:', error.message);
    context.res = UnifiedResponseHandler.internalError(
      'Registration failed. Please try again later.',
    );
  }
};

// Helper function to generate access token
function generateAccessToken(user) {
  const jwt = require('jsonwebtoken');
  const JWT_SECRET = process.env.JWT_SECRET || 'temp-jwt-secret-carpool';

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60, // 24 hours
  };

  return jwt.sign(payload, JWT_SECRET);
}

// Helper function to generate refresh token
function generateRefreshToken(user) {
  const jwt = require('jsonwebtoken');
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'temp-refresh-secret-carpool';

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return jwt.sign(payload, JWT_REFRESH_SECRET);
}

// Export registered users for other functions to use
module.exports.getRegisteredUsers = () => registeredUsers;
module.exports.addRegisteredUser = (user) => registeredUsers.push(user);
