import { useState } from "react";
import { Bell, Search, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuildingSelector } from "./BuildingSelector";
import { SearchCommand } from "./SearchCommand";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onTabChange?: (tab: string) => void;
}

export function Header({ onTabChange }: HeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({ title: "خطا در خروج", variant: "destructive" });
    }
  };

  const displayName = user?.user_metadata?.full_name || user?.email || "کاربر";
  const displayEmail = user?.email || "";

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        {/* Search */}
        <div className="relative w-80 cursor-pointer" onClick={() => setSearchOpen(true)}>
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو... (Ctrl+K)"
            className="pr-10 bg-secondary/50 border-0 focus-visible:ring-1 cursor-pointer"
            readOnly
          />
        </div>
        {onTabChange && (
          <SearchCommand open={searchOpen} onOpenChange={setSearchOpen} onTabChange={onTabChange} />
        )}

        {/* Actions */}
        <div className="flex items-center gap-4">
          <BuildingSelector />
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 left-1 w-2 h-2 bg-accent rounded-full" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-3 pr-4 border-r border-border cursor-pointer hover:opacity-80 transition-opacity">
                <div className="text-left">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{displayEmail}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-foreground" />
                </div>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive cursor-pointer">
                <LogOut className="w-4 h-4 ml-2" />
                خروج از حساب
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
