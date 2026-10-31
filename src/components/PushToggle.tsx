"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type State = "loading" | "off" | "on" | "denied" | "unsupported" | "ios";

function keyToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushToggle({
  audience,
  requestCode,
}: {
  audience: "staff" | "family";
  requestCode?: string;
}) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setState("unsupported");
      return;
    }

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (ios && !standalone) {
      setState("ios");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("denied");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyToBytes(
            process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
          ),
        }));

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
          audience,
          requestCode,
        }),
      });
      setState(res.ok ? "on" : "off");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return null;

  if (state === "unsupported") {
    return (
      <p className="small muted">
        Trình duyệt này không hỗ trợ thông báo đẩy.
      </p>
    );
  }

  if (state === "ios") {
    return (
      <p className="small muted">
        Trên iPhone: bấm <b>Chia sẻ</b> → <b>Thêm vào Màn hình chính</b>, mở lại
        ứng dụng rồi bật thông báo.
      </p>
    );
  }

  if (state === "denied") {
    return (
      <p className="small muted">
        Thông báo đang bị chặn. Mở cài đặt trình duyệt để cho phép lại.
      </p>
    );
  }

  return (
    <button
      type="button"
      className={state === "on" ? "btn btn-ghost btn-sm" : "btn btn-primary btn-sm"}
      onClick={state === "on" ? disable : enable}
      disabled={busy}
    >
      {state === "on" ? <BellOff size={16} /> : <Bell size={16} />}
      {busy ? "Đang xử lý…" : state === "on" ? "Tắt thông báo" : "Bật thông báo đẩy"}
    </button>
  );
}
