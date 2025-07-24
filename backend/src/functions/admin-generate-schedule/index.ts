import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { compose, authenticate } from '../../middleware';
import { hasRole } from '../../middleware/hasRole';
import { SchedulingService } from '../../services/scheduling.service';

async function generateScheduleHandler(
  request: HttpRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: InvocationContext,
): Promise<HttpResponseInit> {
  const groupId = request.params.groupId;
  const { weekStartDate } = (await request.json()) as { weekStartDate: string };

  const assignments = await SchedulingService.generateWeeklySchedule(
    groupId,
    new Date(weekStartDate),
  );

  return {
    status: 200,
    jsonBody: {
      success: true,
      data: assignments,
    },
  };
}

export const main = compose(
  authenticate,
  hasRole(['super_admin', 'group_admin']),
)(generateScheduleHandler);

app.http('admin-generate-schedule', {
  methods: ['POST'],
  authLevel: 'anonymous', // Handled by middleware
  route: 'admin/groups/{groupId}/schedule',
  handler: main,
});
