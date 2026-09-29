"use client";

/** Subscribes this browser to web push. Returns an error message, or null on success. */
export async function enablePush(): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "Push notifications aren't set up on this server yet.";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "This browser doesn't support push notifications. On iPhone, add StudyPilot to your Home Screen first.";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "Notifications are blocked. Allow them in your browser settings, then try again.";
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  const res = await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  return res.ok ? null : "We couldn't save this device for push notifications.";
}

export async function disablePush() {
  const reg = await navigator.serviceWorker?.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await fetch("/api/push", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
    await sub.unsubscribe();
  }
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}
