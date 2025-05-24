"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
exports.createContainer = createContainer;
const trip_service_1 = require("./services/trip.service");
const auth_service_1 = require("./services/auth.service");
const email_service_1 = require("./services/email.service");
const user_service_1 = require("./services/user.service");
const database_1 = require("./config/database");
const trip_repository_1 = require("./repositories/trip.repository");
const user_repository_1 = require("./repositories/user.repository");
const logger_1 = require("./utils/logger");
function createContainer() {
    // Create repositories
    const tripRepository = new trip_repository_1.TripRepository(database_1.containers.trips);
    const userRepository = new user_repository_1.UserRepository(database_1.containers.users);
    // Create services with proper dependencies
    const emailService = new email_service_1.EmailService();
    const userService = new user_service_1.UserService(userRepository, logger_1.loggers.user);
    const authService = new auth_service_1.AuthService(userRepository, logger_1.loggers.auth);
    const tripService = new trip_service_1.TripService(tripRepository, userRepository, emailService, logger_1.loggers.trip);
    return {
        tripService,
        authService,
        emailService,
        userService,
        repositories: {
            tripRepository,
            userRepository
        },
        loggers: logger_1.loggers
    };
}
exports.container = createContainer();
//# sourceMappingURL=container.js.map