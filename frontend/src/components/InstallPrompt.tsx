import { useEffect, useState } from "react";

/**
 * Cross-platform "Install app" prompt.
 *
 * - Android / Chrome / Edge / desktop: uses the `beforeinstallprompt` event
 *   to offer a one-tap native install.
 * - iOS / iPadOS Safari: that event does not exist, so we show concise
 *   "Add to Home Screen" instructions instead.
 * - Hidden entirely when the app is already running standalone (installed).
 *
 * Dismissals are remembered for 14 days via localStorage.
 */

const DISMISS_KEY = "oceanfloor.pwa.installDismissedUntil";
const DISMISS_DAYS = 14;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos(): boolean {
  const ua = window.navigator.userAgent.toLowerCase();
  const isIphoneIpadIpod = /iphone|ipad|ipod/.test(ua);
  // iPadOS 13+ reports as Mac; detect by touch points.
  const isIpadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return isIphoneIpadIpod || isIpadOs;
}

function isDismissed(): boolean {
  const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
  return Date.now() < until;
}

function rememberDismissal() {
  const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISS_KEY, String(until));
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS never fires beforeinstallprompt - show the manual hint instead.
    if (isIos()) {
      setShowIosHelp(true);
      setVisible(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    rememberDismissal();
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setVisible(false);
      setDeferred(null);
      if (choice.outcome === "dismissed") rememberDismissal();
    }
  };

  return (
    <div className="install-banner" role="dialog" aria-label="Install OceanFloor">
      <img src="/pwa-192x192.png" alt="" className="install-banner-icon" />
      <div className="install-banner-body">
        <strong>Install OceanFloor</strong>
        {showIosHelp ? (
          <span className="install-banner-text">
            Tap the Share icon{" "}
            <span aria-hidden="true">&#x2191;</span> then{" "}
            <em>Add to Home Screen</em>.
          </span>
        ) : (
          <span className="install-banner-text">
            Add it to your home screen for a full-screen, app-like experience.
          </span>
        )}
      </div>
      <div className="install-banner-actions">
        {!showIosHelp && deferred && (
          <button className="install-btn" onClick={install}>
            Install
          </button>
        )}
        <button
          className={showIosHelp ? "install-btn" : "install-dismiss"}
          onClick={dismiss}
          aria-label="Dismiss install prompt"
        >
          {showIosHelp ? "Got it" : "\u00D7"}
        </button>
      </div>
    </div>
  );
}
