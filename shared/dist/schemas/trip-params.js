"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinTripParamSchema = exports.tripIdParamSchema = void 0;
const zod_1 = require("zod");
// Schema for trip ID in URL
exports.tripIdParamSchema = zod_1.z.object({
    tripId: zod_1.z.string().uuid('Invalid trip ID format')
});
// Schema for join trip request body
exports.joinTripParamSchema = zod_1.z.object({
    pickupLocation: zod_1.z.string().min(1, 'Pickup location is required')
});
//# sourceMappingURL=trip-params.js.map