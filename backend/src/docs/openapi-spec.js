"use strict";
/**
 * OpenAPI 3.0 Specification for Carpool API
 * Comprehensive API documentation with security and performance considerations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.openApiSpec = void 0;
exports.openApiSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Carpool API',
        version: '1.0.0',
        description: `
      Comprehensive carpool management system API for schools.
      
      ## Features
      - JWT-based authentication with role-based access control
      - Real-time trip management and matching
      - Performance optimized with caching and rate limiting
      - Comprehensive input validation and sanitization
      
      ## Security
      - All endpoints require authentication except public auth endpoints
      - Rate limiting applied per user and endpoint type
      - Input sanitization and validation on all requests
      - Audit logging for all operations
    `,
        contact: {
            name: 'Carpool Support',
            email: 'support@carpool.com'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        }
    },
    servers: [
        {
            url: 'https://carpool-functions.azurewebsites.net/api',
            description: 'Production server'
        },
        {
            url: 'https://carpool-functions-staging.azurewebsites.net/api',
            description: 'Staging server'
        },
        {
            url: 'http://localhost:7071/api',
            description: 'Development server'
        }
    ],
    paths: {
        '/auth/login': {
            post: {
                tags: ['Authentication'],
                summary: 'User login',
                description: 'Authenticate user and return JWT tokens',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/LoginRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Login successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthResponse' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Invalid credentials',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '429': {
                        description: 'Rate limit exceeded',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/auth/register': {
            post: {
                tags: ['Authentication'],
                summary: 'User registration',
                description: 'Register a new user account',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/RegisterRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Registration successful',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthResponse' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid request or user already exists',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '429': {
                        description: 'Rate limit exceeded',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/auth/refresh': {
            post: {
                tags: ['Authentication'],
                summary: 'Refresh access token',
                description: 'Get new access token using refresh token',
                security: [{ refreshToken: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    refreshToken: {
                                        type: 'string',
                                        description: 'Valid refresh token'
                                    }
                                },
                                required: ['refreshToken']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Token refreshed successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/TokenResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Invalid or expired refresh token',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/trips': {
            get: {
                tags: ['Trips'],
                summary: 'Get trips',
                description: 'Retrieve trips with pagination and filtering',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'page',
                        in: 'query',
                        description: 'Page number (1-based)',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1
                        }
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        description: 'Number of items per page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 20
                        }
                    },
                    {
                        name: 'status',
                        in: 'query',
                        description: 'Filter by trip status',
                        schema: {
                            type: 'string',
                            enum: ['ACTIVE', 'COMPLETED', 'CANCELLED']
                        }
                    },
                    {
                        name: 'driverId',
                        in: 'query',
                        description: 'Filter by driver ID',
                        schema: {
                            type: 'string'
                        }
                    },
                    {
                        name: 'dateFrom',
                        in: 'query',
                        description: 'Filter trips from this date (ISO 8601)',
                        schema: {
                            type: 'string',
                            format: 'date-time'
                        }
                    },
                    {
                        name: 'dateTo',
                        in: 'query',
                        description: 'Filter trips to this date (ISO 8601)',
                        schema: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Trips retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/PaginatedTripsResponse' }
                            }
                        },
                        headers: {
                            'X-Total-Count': {
                                description: 'Total number of trips',
                                schema: { type: 'integer' }
                            },
                            'X-Page-Count': {
                                description: 'Total number of pages',
                                schema: { type: 'integer' }
                            },
                            'X-Response-Time': {
                                description: 'Response time in milliseconds',
                                schema: { type: 'string' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid query parameters',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '429': {
                        description: 'Rate limit exceeded',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            post: {
                tags: ['Trips'],
                summary: 'Create trip',
                description: 'Create a new carpool trip',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/CreateTripRequest' }
                        }
                    }
                },
                responses: {
                    '201': {
                        description: 'Trip created successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Trip' }
                            }
                        },
                        headers: {
                            'Location': {
                                description: 'URL of the created trip',
                                schema: { type: 'string' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid trip data',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '403': {
                        description: 'Insufficient permissions',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '429': {
                        description: 'Rate limit exceeded',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/trips/{id}': {
            get: {
                tags: ['Trips'],
                summary: 'Get trip by ID',
                description: 'Retrieve a specific trip by its ID',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Trip ID',
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Trip retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Trip' }
                            }
                        }
                    },
                    '404': {
                        description: 'Trip not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            put: {
                tags: ['Trips'],
                summary: 'Update trip',
                description: 'Update an existing trip (driver only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Trip ID',
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateTripRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Trip updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Trip' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid trip data',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '403': {
                        description: 'Insufficient permissions',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '404': {
                        description: 'Trip not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            delete: {
                tags: ['Trips'],
                summary: 'Cancel trip',
                description: 'Cancel an existing trip (driver only)',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Trip ID',
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                responses: {
                    '204': {
                        description: 'Trip cancelled successfully'
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '403': {
                        description: 'Insufficient permissions',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '404': {
                        description: 'Trip not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/trips/{id}/join': {
            post: {
                tags: ['Trips'],
                summary: 'Join trip',
                description: 'Join an existing trip as a passenger',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Trip ID',
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    pickupLocation: {
                                        type: 'string',
                                        description: 'Pickup location for the passenger',
                                        minLength: 1,
                                        maxLength: 200
                                    }
                                },
                                required: ['pickupLocation']
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Successfully joined trip',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Trip' }
                            }
                        }
                    },
                    '400': {
                        description: 'Cannot join trip (full, already joined, etc.)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '404': {
                        description: 'Trip not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/trips/{id}/leave': {
            post: {
                tags: ['Trips'],
                summary: 'Leave trip',
                description: 'Leave a trip as a passenger',
                security: [{ bearerAuth: [] }],
                parameters: [
                    {
                        name: 'id',
                        in: 'path',
                        required: true,
                        description: 'Trip ID',
                        schema: {
                            type: 'string',
                            format: 'uuid'
                        }
                    }
                ],
                responses: {
                    '200': {
                        description: 'Successfully left trip',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/Trip' }
                            }
                        }
                    },
                    '400': {
                        description: 'Cannot leave trip (not a passenger, etc.)',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    },
                    '404': {
                        description: 'Trip not found',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/users/profile': {
            get: {
                tags: ['Users'],
                summary: 'Get user profile',
                description: 'Get the authenticated user\'s profile',
                security: [{ bearerAuth: [] }],
                responses: {
                    '200': {
                        description: 'Profile retrieved successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            },
            put: {
                tags: ['Users'],
                summary: 'Update user profile',
                description: 'Update the authenticated user\'s profile',
                security: [{ bearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/UpdateUserRequest' }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Profile updated successfully',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/User' }
                            }
                        }
                    },
                    '400': {
                        description: 'Invalid profile data',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ValidationErrorResponse' }
                            }
                        }
                    },
                    '401': {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/ErrorResponse' }
                            }
                        }
                    }
                }
            }
        },
        '/health': {
            get: {
                tags: ['System'],
                summary: 'Health check',
                description: 'Check system health and status',
                responses: {
                    '200': {
                        description: 'System is healthy',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/HealthResponse' }
                            }
                        }
                    },
                    '503': {
                        description: 'System is unhealthy',
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/HealthResponse' }
                            }
                        }
                    }
                }
            }
        }
    },
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            },
            refreshToken: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    firstName: { type: 'string' },
                    lastName: { type: 'string' },
                    role: { type: 'string', enum: ['STUDENT', 'PARENT', 'ADMIN'] },
                    phone: { type: 'string', nullable: true },
                    grade: { type: 'string', nullable: true },
                    emergencyContact: { type: 'string', nullable: true },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'email', 'firstName', 'lastName', 'role', 'createdAt', 'updatedAt']
            },
            Trip: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid' },
                    driverId: { type: 'string', format: 'uuid' },
                    driver: { $ref: '#/components/schemas/User' },
                    origin: { type: 'string' },
                    destination: { type: 'string' },
                    departureTime: { type: 'string', format: 'date-time' },
                    maxPassengers: { type: 'integer', minimum: 1, maximum: 8 },
                    currentPassengers: { type: 'integer', minimum: 0 },
                    costPerPerson: { type: 'number', minimum: 0 },
                    status: { type: 'string', enum: ['ACTIVE', 'COMPLETED', 'CANCELLED'] },
                    description: { type: 'string', nullable: true },
                    passengers: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                userId: { type: 'string', format: 'uuid' },
                                user: { $ref: '#/components/schemas/User' },
                                pickupLocation: { type: 'string' },
                                joinedAt: { type: 'string', format: 'date-time' }
                            }
                        }
                    },
                    createdAt: { type: 'string', format: 'date-time' },
                    updatedAt: { type: 'string', format: 'date-time' }
                },
                required: ['id', 'driverId', 'origin', 'destination', 'departureTime', 'maxPassengers', 'currentPassengers', 'costPerPerson', 'status', 'passengers', 'createdAt', 'updatedAt']
            },
            LoginRequest: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 1 }
                },
                required: ['email', 'password']
            },
            RegisterRequest: {
                type: 'object',
                properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]' },
                    firstName: { type: 'string', minLength: 1, maxLength: 50 },
                    lastName: { type: 'string', minLength: 1, maxLength: 50 },
                    role: { type: 'string', enum: ['STUDENT', 'PARENT'] },
                    phone: { type: 'string', nullable: true, pattern: '^\\+?[1-9]\\d{1,14}$' },
                    grade: { type: 'string', nullable: true },
                    emergencyContact: { type: 'string', nullable: true }
                },
                required: ['email', 'password', 'firstName', 'lastName', 'role']
            },
            UpdateUserRequest: {
                type: 'object',
                properties: {
                    firstName: { type: 'string', minLength: 1, maxLength: 50 },
                    lastName: { type: 'string', minLength: 1, maxLength: 50 },
                    phone: { type: 'string', nullable: true, pattern: '^\\+?[1-9]\\d{1,14}$' },
                    grade: { type: 'string', nullable: true },
                    emergencyContact: { type: 'string', nullable: true }
                }
            },
            CreateTripRequest: {
                type: 'object',
                properties: {
                    origin: { type: 'string', minLength: 1, maxLength: 200 },
                    destination: { type: 'string', minLength: 1, maxLength: 200 },
                    departureTime: { type: 'string', format: 'date-time' },
                    maxPassengers: { type: 'integer', minimum: 1, maximum: 8 },
                    costPerPerson: { type: 'number', minimum: 0, maximum: 1000 },
                    description: { type: 'string', nullable: true, maxLength: 500 }
                },
                required: ['origin', 'destination', 'departureTime', 'maxPassengers', 'costPerPerson']
            },
            UpdateTripRequest: {
                type: 'object',
                properties: {
                    origin: { type: 'string', minLength: 1, maxLength: 200 },
                    destination: { type: 'string', minLength: 1, maxLength: 200 },
                    departureTime: { type: 'string', format: 'date-time' },
                    maxPassengers: { type: 'integer', minimum: 1, maximum: 8 },
                    costPerPerson: { type: 'number', minimum: 0, maximum: 1000 },
                    description: { type: 'string', nullable: true, maxLength: 500 }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            user: { $ref: '#/components/schemas/User' },
                            token: { type: 'string' },
                            refreshToken: { type: 'string' },
                            expiresIn: { type: 'integer' }
                        },
                        required: ['user', 'token', 'refreshToken', 'expiresIn']
                    }
                },
                required: ['success', 'data']
            },
            TokenResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            token: { type: 'string' },
                            expiresIn: { type: 'integer' }
                        },
                        required: ['token', 'expiresIn']
                    }
                },
                required: ['success', 'data']
            },
            PaginatedTripsResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            trips: {
                                type: 'array',
                                items: { $ref: '#/components/schemas/Trip' }
                            },
                            pagination: {
                                type: 'object',
                                properties: {
                                    page: { type: 'integer' },
                                    limit: { type: 'integer' },
                                    totalPages: { type: 'integer' },
                                    totalCount: { type: 'integer' },
                                    hasNext: { type: 'boolean' },
                                    hasPrev: { type: 'boolean' }
                                },
                                required: ['page', 'limit', 'totalPages', 'totalCount', 'hasNext', 'hasPrev']
                            }
                        },
                        required: ['trips', 'pagination']
                    }
                },
                required: ['success', 'data']
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', enum: [false] },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string' },
                            details: { type: 'object', nullable: true }
                        },
                        required: ['message', 'code']
                    },
                    requestId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                },
                required: ['success', 'error', 'requestId', 'timestamp']
            },
            ValidationErrorResponse: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', enum: [false] },
                    error: {
                        type: 'object',
                        properties: {
                            message: { type: 'string' },
                            code: { type: 'string', enum: ['VALIDATION_ERROR'] },
                            details: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    errors: {
                                        type: 'array',
                                        items: { type: 'string' }
                                    }
                                }
                            }
                        },
                        required: ['message', 'code', 'details']
                    },
                    requestId: { type: 'string' },
                    timestamp: { type: 'string', format: 'date-time' }
                },
                required: ['success', 'error', 'requestId', 'timestamp']
            },
            HealthResponse: {
                type: 'object',
                properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                    checks: {
                        type: 'object',
                        additionalProperties: {
                            type: 'object',
                            properties: {
                                status: { type: 'string' },
                                message: { type: 'string', nullable: true },
                                duration: { type: 'number', nullable: true }
                            },
                            required: ['status']
                        }
                    },
                    timestamp: { type: 'string', format: 'date-time' },
                    version: { type: 'string' },
                    uptime: { type: 'number' }
                },
                required: ['status', 'checks', 'timestamp', 'version', 'uptime']
            }
        }
    },
    tags: [
        {
            name: 'Authentication',
            description: 'User authentication and authorization'
        },
        {
            name: 'Trips',
            description: 'Carpool trip management'
        },
        {
            name: 'Users',
            description: 'User profile management'
        },
        {
            name: 'System',
            description: 'System health and monitoring'
        }
    ]
};
