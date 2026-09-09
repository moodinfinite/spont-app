import webpush from 'web-push'
import { prisma } from '@spont/db'
import type { PushSender, PushSubscriptionRecord, PushPayload } from '@spont/core'

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:support@spont.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

export class WebPushSender implements PushSender {
  async send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        },
        JSON.stringify(payload),
      )
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode
      if (statusCode === 404 || statusCode === 410) {
        await prisma.pushSubscription.deleteMany({ where: { endpoint: subscription.endpoint } })
      }
      throw err
    }
  }
}
