export type NotificationType =
  | "JOIN_REQUEST"
  | "JOIN_DECISION"
  | "PREFERENCE_REMINDER"
  | "SCHEDULE_PUBLISHED"
  | "EMERGENCY_ALERT"
  | "GENERIC";

export interface NotificationPayload {
  [key: string]: unknown;
}

export interface Notification {
  id: string; // uuid
  type: NotificationType;
  actorId: string; // who triggered
  targetUserIds?: string[]; // recipients; if undefined broadcast to group
  groupId?: string;
  payload: NotificationPayload;
  createdAt: string; // ISO
  read?: boolean;
} 