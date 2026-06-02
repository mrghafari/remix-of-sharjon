import { useEffect, useRef, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const STORAGE_KEY_DISMISSED = "pwa_install_dismissed";
const STORAGE_KEY_INSTALLED = "pwa_installed";
const DELAY_MS = 10000; // 10 seconds

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAlreadyInstalled = () => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    return standalone || localStorage.getItem(STORAGE_KEY_INSTALLED) === "1";
  };

  useEffect(() => {
    if (isAlreadyInstalled()) return;
    if (localStorage.getItem(STORAGE_KEY_DISMISSED) === "1") return;

    // Detect iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    setIsIOS(ios);

    // Listen for beforeinstallprompt (Android/Chrome/Desktop)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      // Show after 10 seconds
      timerRef.current = setTimeout(() => {
        if (!isAlreadyInstalled()) setVisible(true);
      }, DELAY_MS);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    const installedHandler = () => {
      localStorage.setItem(STORAGE_KEY_INSTALLED, "1");
      setVisible(false);
      setShowIOSHint(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    window.addEventListener("appinstalled", installedHandler);

    // For iOS: show hint after 10 seconds too
    if (ios) {
      timerRef.current = setTimeout(() => {
        if (!isAlreadyInstalled()) setShowIOSHint(true);
      }, DELAY_MS);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
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
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (visible && deferred) {
    return (
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
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
      <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-fade-in">
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
