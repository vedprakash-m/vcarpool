"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tripStatsQuerySchema = exports.userIdParamSchema = void 0;
const zod_1 = require("zod");
// Schema for user ID in URL
exports.userIdParamSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid('Invalid user ID format')
});
// Schema for trip stats query parameters
exports.tripStatsQuerySchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['week', 'month', 'year', 'all']).optional().default('all'),
});
//# sourceMappingURL=user-params.js.map