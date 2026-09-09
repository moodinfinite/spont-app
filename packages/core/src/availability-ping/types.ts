export interface PushSubscriptionRecord {
  endpoint: string
  p256dh: string
  auth: string
}

export interface PushPayload {
  title: string
  body: string
  url: string
}

export interface PushSender {
  send(subscription: PushSubscriptionRecord, payload: PushPayload): Promise<void>
}
