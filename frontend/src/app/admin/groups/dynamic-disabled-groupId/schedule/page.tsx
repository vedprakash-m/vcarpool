import GroupSchedulePageClient from './client-page';

export async function generateStaticParams() {
  // Return empty array for build-time - in production this would fetch actual group IDs
  return [];
}

export default function GroupSchedulePage() {
  return <GroupSchedulePageClient />;
}
