import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY_DISMISSED = "pwa_install_dismissed";
const STORAGE_KEY_INSTALLED = "pwa_installed";
const VISIBLE_MS = 10000; // visible for 10 seconds then auto-hide

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAlreadyInstalled = () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    return standalone || localStorage.getItem(STORAGE_KEY_INSTALLED) === "1";
  };

  const scheduleAutoHide = (onHide: () => void) => {
    // Start fade-out shortly before fully hiding
    fadeTimerRef.current = setTimeout(() => setFadingOut(true), VISIBLE_MS - 400);
    hideTimerRef.current = setTimeout(() => {
      onHide();
      setFadingOut(false);
    }, VISIBLE_MS);
  };

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (localStorage.getItem(STORAGE_KEY_DISMISSED) === "1") return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
      scheduleAutoHide(() => setVisible(false));
    };
    window.addEventListener("beforeinstallprompt", handler);

    const installedHandler = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "1");
      setVisible(false);
      setShowIOSHint(false);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
    window.addEventListener("appinstalled", installedHandler);

    if (ios) {
      setShowIOSHint(true);
      scheduleAutoHide(() => setShowIOSHint(false));
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "1");
    }
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setVisible(false);
    setShowIOSHint(false);
    localStorage.setItem(STORAGE_KEY_DISMISSED, "1");
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
  };

  const wrapperCls = `fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 transition-opacity duration-500 ${
    fadingOut ? "opacity-0" : "opacity-100 animate-fade-in"
  }`;

  if (visible && deferred) {
    return (
      <div className={wrapperCls}>
        <div className="bg-card border border-border shadow-lg rounded-xl p-4 flex items-center gap-3" dir="rtl">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">نصب اپلیکیشن</div>
            <div className="text-xs text-muted-foreground">برای دسترسی سریع‌تر نصب کنید</div>
          </div>
          <Button size="sm" onClick={handleInstall}>نصب</Button>
          <Button size="icon" variant="ghost" onClick={dismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (isIOS && showIOSHint) {
    return (
      <div className={wrapperCls}>
        <div className="bg-card border border-border shadow-lg rounded-xl p-4 flex items-start gap-3" dir="rtl">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Download className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-xs leading-6">
            <div className="font-semibold text-sm mb-1">نصب روی iPhone</div>
            در Safari دکمه اشتراک‌گذاری <span className="font-bold">⬆️</span> را بزنید و سپس
            «<span className="font-bold">Add to Home Screen</span>» را انتخاب کنید.
          </div>
          <Button size="icon" variant="ghost" onClick={dismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
