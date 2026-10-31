"use client";

import { useEffect, useState } from "react";
import { Download, MoreVertical, Plus, Share, X } from "lucide-react";

const SNOOZE_KEY = "dktt_install_snooze";
const SNOOZE_MS = 12 * 60 * 60 * 1000;

function isStandalone() {
  if (typeof window === "undefined") return true;
  const modes = ["standalone", "fullscreen", "minimal-ui"];
  return (
    modes.some((m) => window.matchMedia(`(display-mode: ${m})`).matches) ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS() {
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isMobile() {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

function isInAppBrowser() {
  return /Zalo|FBAN|FBAV|Instagram|Line\/|MicroMessenger/i.test(
    navigator.userAgent,
  );
}

export function InstallGuide() {
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);
  const [inApp, setInApp] = useState(false);
  const [installEvent, setInstallEvent] = useState<
    (Event & { prompt?: () => Promise<void> }) | null
  >(null);

  useEffect(() => {
    if (isStandalone() || !isMobile()) return;

    setIos(isIOS());
    setInApp(isInAppBrowser());

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    const openGuide = () => {
      if (!isStandalone()) setOpen(true);
    };
    window.addEventListener("dktt:install", openGuide);

    const snoozed = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    const timer = window.setTimeout(() => {
      if (Date.now() - snoozed > SNOOZE_MS) openGuide();
    }, 1400);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("dktt:install", openGuide);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  function snooze() {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setOpen(false);
  }

  async function installNow() {
    if (installEvent?.prompt) {
      await installEvent.prompt();
      setOpen(false);
    }
  }

  return (
    <div
      className="install-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-title"
    >
      <div className="install-sheet">
        <div className="install-head">
          <img src="/icons/icon-192.png" alt="" width={40} height={40} />
          <div>
            <h2 id="install-title">Cài app để nhận thông báo</h2>
            <p className="tiny muted">Bắt buộc trên điện thoại</p>
          </div>
          <button
            type="button"
            className="install-close"
            onClick={snooze}
            aria-label="Để sau"
          >
            <X size={18} />
          </button>
        </div>

        <p className="small">
          Trình duyệt trên điện thoại <b>không nhận được thông báo đẩy</b>. Thêm
          ứng dụng vào Màn hình chính rồi mở từ biểu tượng đó — khi đó mới bật
          được thông báo và biết ngay khi đại đội duyệt.
        </p>

        {inApp ? (
          <div className="alert" data-tone="error">
            <span>
              Bạn đang mở trong Zalo/Facebook. Hãy bấm <b>•••</b> →{" "}
              <b>Mở bằng trình duyệt</b> (Safari hoặc Chrome) rồi làm theo hướng
              dẫn.
            </span>
          </div>
        ) : null}

        <ol className="install-steps">
          {ios ? (
            <>
              <li>
                <span className="n">1</span>
                <span>
                  Bấm nút <Share size={15} aria-hidden /> <b>Chia sẻ</b> ở thanh
                  dưới Safari.
                </span>
              </li>
              <li>
                <span className="n">2</span>
                <span>
                  Chọn <Plus size={15} aria-hidden />{" "}
                  <b>Thêm vào Màn hình chính</b>.
                </span>
              </li>
              <li>
                <span className="n">3</span>
                <span>
                  Mở app từ biểu tượng vừa thêm, vào <b>Cài đặt</b> và bật thông
                  báo.
                </span>
              </li>
            </>
          ) : (
            <>
              <li>
                <span className="n">1</span>
                <span>
                  Bấm menu <MoreVertical size={15} aria-hidden /> <b>⋮</b> ở góc
                  trên Chrome.
                </span>
              </li>
              <li>
                <span className="n">2</span>
                <span>
                  Chọn <b>Cài đặt ứng dụng</b> hoặc{" "}
                  <b>Thêm vào Màn hình chính</b>.
                </span>
              </li>
              <li>
                <span className="n">3</span>
                <span>
                  Mở app từ biểu tượng, vào <b>Cài đặt</b> và bật thông báo.
                </span>
              </li>
            </>
          )}
        </ol>

        <div className="install-actions">
          {installEvent ? (
            <button type="button" className="btn btn-primary" onClick={installNow}>
              <Download size={16} aria-hidden /> Cài đặt ngay
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Tôi đã thêm vào Màn hình chính
            </button>
          )}
          <button type="button" className="btn btn-quiet" onClick={snooze}>
            Để sau
          </button>
        </div>

        <p className="tiny muted">
          Thêm một lần là xong. Nếu đã cài, mở app từ biểu tượng trên màn hình
          chính.
        </p>
      </div>
    </div>
  );
}
