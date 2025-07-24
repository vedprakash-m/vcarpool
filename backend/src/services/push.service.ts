// eslint-disable-next-line @typescript-eslint/no-var-requires
const webpush = require('web-push');
type PushSubscription = any;

export class PushService {
  private vapidSet = false;

  constructor() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails('mailto:support@carpool.com', publicKey, privateKey);
      this.vapidSet = true;
    }
  }

  async sendPush(subscription: PushSubscription, payload: any): Promise<void> {
    if (!this.vapidSet) return;
    try {
      await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (err) {
      console.error('Error sending push', err);
    }
  }

  async sendPushNotification(userId: string, payload: any): Promise<void> {
    if (!this.vapidSet) return;

    try {
      // In a real implementation, you would:
      // 1. Get user's push subscription from database
      // 2. Send the notification
      // For now, we'll just log and return
      console.log(`Push notification would be sent to user ${userId}:`, payload);
    } catch (err) {
      console.error('Error sending push notification', err);
    }
  }
}
