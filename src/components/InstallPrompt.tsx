import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    // Detect iOS (iOS Safari doesn't support beforeinstallprompt)
    const ua = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    const dismissed = localStorage.getItem("pwa_install_dismissed") === "1";

    setIsIOS(ios);

    if (standalone || dismissed) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // For iOS show hint after small delay
    if (ios) {
      const t = setTimeout(() => setShowIOSHint(true), 3000);
      return () => {
        window.removeEventListener("beforeinstallprompt", handler);
        clearTimeout(t);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted" || choice.outcome === "dismissed") {
      setVisible(false);
      setDeferred(null);
    }
  };

  const dismiss = () => {
    setVisible(false);
    setShowIOSHint(false);
    localStorage.setItem("pwa_install_dismissed", "1");
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
