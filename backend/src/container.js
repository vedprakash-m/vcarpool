"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
exports.createContainer = createContainer;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
// Import your services and repositories here
const auth_service_1 = require("./services/auth.service");
const user_service_1 = require("./services/user.service");
const trip_service_1 = require("./services/trip.service");
const family_service_1 = require("./services/family.service");
const child_service_1 = require("./services/child.service");
const preference_service_1 = require("./services/preference.service");
const scheduling_service_1 = require("./services/scheduling.service");
const user_repository_1 = require("./repositories/user.repository");
const family_repository_1 = require("./repositories/family.repository");
const child_repository_1 = require("./repositories/child.repository");
const logger_1 = require("./utils/logger");
function createContainer() {
    // Register services and repositories
    tsyringe_1.container.register("AuthService", {
        useClass: auth_service_1.AuthService,
    });
    tsyringe_1.container.register("UserService", {
        useClass: user_service_1.UserService,
    });
    tsyringe_1.container.register("TripService", {
        useClass: trip_service_1.TripService,
    });
    tsyringe_1.container.register("FamilyService", {
        useClass: family_service_1.FamilyService,
    });
    tsyringe_1.container.register("ChildService", {
        useClass: child_service_1.ChildService,
    });
    tsyringe_1.container.register("PreferenceService", {
        useClass: preference_service_1.PreferenceService,
    });
    tsyringe_1.container.register("SchedulingService", {
        useClass: scheduling_service_1.SchedulingService,
    });
    tsyringe_1.container.register("UserRepository", {
        useClass: user_repository_1.UserRepository,
    });
    tsyringe_1.container.register("FamilyRepository", {
        useClass: family_repository_1.FamilyRepository,
    });
    tsyringe_1.container.register("ChildRepository", {
        useClass: child_repository_1.ChildRepository,
    });
    // Logger registration
    const logger = new logger_1.AzureLogger();
    tsyringe_1.container.register("ILogger", { useValue: logger });
    const serviceContainer = tsyringe_1.container;
    // Add service getters
    Object.defineProperty(serviceContainer, "authService", {
        get: () => tsyringe_1.container.resolve("AuthService"),
    });
    Object.defineProperty(serviceContainer, "userService", {
        get: () => tsyringe_1.container.resolve("UserService"),
    });
    Object.defineProperty(serviceContainer, "tripService", {
        get: () => tsyringe_1.container.resolve("TripService"),
    });
    Object.defineProperty(serviceContainer, "familyService", {
        get: () => tsyringe_1.container.resolve("FamilyService"),
    });
    Object.defineProperty(serviceContainer, "childService", {
        get: () => tsyringe_1.container.resolve("ChildService"),
    });
    Object.defineProperty(serviceContainer, "preferenceService", {
        get: () => tsyringe_1.container.resolve("PreferenceService"),
    });
    Object.defineProperty(serviceContainer, "schedulingService", {
        get: () => tsyringe_1.container.resolve("SchedulingService"),
    });
    Object.defineProperty(serviceContainer, "userRepository", {
        get: () => tsyringe_1.container.resolve("UserRepository"),
    });
    Object.defineProperty(serviceContainer, "familyRepository", {
        get: () => tsyringe_1.container.resolve("FamilyRepository"),
    });
    Object.defineProperty(serviceContainer, "childRepository", {
        get: () => tsyringe_1.container.resolve("ChildRepository"),
    });
    // Add logger getters
    Object.defineProperty(serviceContainer, "loggers", {
        get: () => ({
            system: logger,
            trip: logger,
            auth: logger,
            user: logger,
        }),
    });
    return serviceContainer;
}
exports.container = createContainer();
