"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const functions_1 = require("@azure/functions");
const middleware_1 = require("../../middleware");
const hasRole_1 = require("../../middleware/hasRole");
const scheduling_service_1 = require("../../services/scheduling.service");
async function generateScheduleHandler(request, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
_context) {
    const groupId = request.params.groupId;
    const { weekStartDate } = (await request.json());
    const assignments = await scheduling_service_1.SchedulingService.generateWeeklySchedule(groupId, new Date(weekStartDate));
    return {
        status: 200,
        jsonBody: {
            success: true,
            data: assignments,
        },
    };
}
exports.main = (0, middleware_1.compose)(middleware_1.authenticate, (0, hasRole_1.hasRole)(["admin", "group_admin"]))(generateScheduleHandler);
functions_1.app.http("admin-generate-schedule", {
    methods: ["POST"],
    authLevel: "anonymous", // Handled by middleware
    route: "admin/groups/{groupId}/schedule",
    handler: exports.main,
});
