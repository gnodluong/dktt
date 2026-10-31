import webpush from "web-push";
import { VAPID_PRIVATE, VAPID_PUBLIC, VAPID_SUBJECT } from "@/lib/env";
import { admin } from "@/lib/supabase/admin";

interface Sub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

let ready = false;

function init() {
  if (ready) return;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  ready = true;
}

async function deliver(subs: Sub[], payload: PushPayload) {
  init();
  if (!ready || !subs.length) return 0;
  let sent = 0;
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await admin().from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
  return sent;
}

export async function notifyStaff(payload: PushPayload) {
  try {
    const { data } = await admin()
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("audience", "staff");
    return await deliver((data ?? []) as Sub[], payload);
  } catch {
    return 0;
  }
}

export async function notifyFamily(requestId: string, payload: PushPayload) {
  try {
    const { data } = await admin()
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("audience", "family")
      .eq("request_id", requestId);
    return await deliver((data ?? []) as Sub[], payload);
  } catch {
    return 0;
  }
}

export async function notifyAllFamily(payload: PushPayload) {
  try {
    const { data } = await admin()
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("audience", "family");
    return await deliver((data ?? []) as Sub[], payload);
  } catch {
    return 0;
  }
}

export async function notifyOwn(staffId: string, payload: PushPayload) {
  try {
    const { data } = await admin()
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("audience", "staff")
      .eq("staff_id", staffId);
    return await deliver((data ?? []) as Sub[], payload);
  } catch {
    return 0;
  }
}
