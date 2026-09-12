/**
 * OneSignal push notification helper
 */

interface PushPayload {
  clerkUserId: string
  title: string
  message: string
  url?: string
}

export async function sendPushNotification(payload: PushPayload) {
  const { clerkUserId, title, message, url = '/status' } = payload

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID,
        include_external_user_ids: [clerkUserId],
        headings: { en: title },
        contents: { en: message },
        url: `${process.env.NEXT_PUBLIC_APP_URL}${url}`,
        web_push_topic: 'cyndy-portal',
        small_icon: 'ic_stat_onesignal_default',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('[OneSignal] Push failed:', error)
      return { success: false, error }
    }

    const data = await response.json()
    return { success: true, id: data.id }
  } catch (error) {
    console.error('[OneSignal] Push error:', error)
    return { success: false, error }
  }
}

export async function sendBulkPushNotification(
  clerkUserIds: string[],
  title: string,
  message: string,
  url = '/status'
) {
  const chunks: string[][] = []
  for (let i = 0; i < clerkUserIds.length; i += 2000) {
    chunks.push(clerkUserIds.slice(i, i + 2000))
  }

  const results = await Promise.allSettled(
    chunks.map(chunk =>
      sendPushNotification({ clerkUserId: chunk[0], title, message, url })
    )
  )

  return results
}
