import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, LogOut, Menu, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuildingSelector } from "./BuildingSelector";
import { ShamsiDateDisplay } from "./ShamsiDateDisplay";
import { SearchCommand } from "./SearchCommand";
import { NotificationBell } from "./NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useBuilding } from "@/contexts/BuildingContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onTabChange?: (tab: string) => void;
  onMenuClick?: () => void;
}

export function Header({ onTabChange, onMenuClick }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { currentBuildingId } = useBuilding();
  const { toast } = useToast();
  const navigate = useNavigate();

  const hasMultipleMatches = (() => {
    try {
      const all = JSON.parse(localStorage.getItem("resident_matches_all") || "[]");
      return Array.isArray(all) && all.length > 1;
    } catch { return false; }
  })();

  const handleSignOut = async () => {
    try {
      localStorage.removeItem("resident_matches");
      localStorage.removeItem("resident_matches_all");
      localStorage.removeItem("resident_matches_phone");
      localStorage.removeItem("currentBuildingId");
      const { error } = await signOut();
      if (error && !/session/i.test(error.message || "")) {
        toast({ title: "خطا در خروج", description: error.message, variant: "destructive" });
        return;
      }
    } catch (err: any) {
      console.warn("signOut error ignored:", err?.message);
    }
    window.location.href = "/";
  };

  const rawEmail = user?.email || "";
  const rawName = user?.user_metadata?.full_name || "";
  const cleanValue = (val: string) => val.replace(/@resident\.local$/i, "").trim();
  const displayPhone = rawEmail.includes("@resident.local") ? cleanValue(rawEmail) : "";
  const displayName = (rawName && !rawName.includes("@resident.local") ? rawName : "")
    || displayPhone
    || cleanValue(rawEmail)
    || "کاربر";

  return (
    <header
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between h-14 md:h-16 px-3 md:px-6 gap-2">
        <div className="relative flex-1 max-w-xs md:w-80 cursor-pointer" onClick={() => setSearchOpen(true)}>
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو..."
            className="pr-10 h-9 md:h-10 bg-secondary/50 border-0 focus-visible:ring-1 cursor-pointer text-xs md:text-sm"
            readOnly
          />
        </div>
        {onTabChange && (
          <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} onTabChange={onTabChange} />
        )}

        <div className="hidden md:flex flex-1 justify-center">
          <ShamsiDateDisplay />
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <div className="hidden md:block">
            <BuildingSelector />
          </div>
          <NotificationBell buildingId={currentBuildingId || undefined} isManager={true} onNavigate={(t) => onTabChange?.(t)} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 md:gap-3 md:pr-4 md:border-r md:border-border cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-left hidden md:block">
                  <p className="text-sm font-medium">{displayName}</p>
                </div>
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-4 h-4 md:w-5 md:h-5 text-primary-foreground" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {hasMultipleMatches && (
                <>
                  <DropdownMenuItem onClick={() => navigate("/resident-auth")} className="cursor-pointer">
                    <Repeat className="w-4 h-4 ml-2" />
                    تغییر نقش / ساختمان
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 ml-2" />
                خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onMenuClick && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={onMenuClick}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
      <div className="md:hidden px-3 pb-2">
        <BuildingSelector />
      </div>
    </header>
  );
}
