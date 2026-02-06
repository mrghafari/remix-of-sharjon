import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X } from "lucide-react";
import { useCreateCategory } from "@/hooks/useExpenseCategories";

const emojiOptions = ["📋", "🔧", "🏠", "💡", "🚿", "🌡️", "🚗", "🛠️", "📦", "💳", "🏗️", "🧰"];

interface CategoryFormProps {
  onClose: () => void;
}

export function CategoryForm({ onClose }: CategoryFormProps) {
  const [name, setName] = useState("");
  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("📋");
  
  const createCategory = useCreateCategory();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !label.trim()) return;
    
    // Convert label to a valid name (lowercase, no spaces)
    const categoryName = name.trim().toLowerCase().replace(/\s+/g, '_');
    
    createCategory.mutate(
      { name: categoryName, label: label.trim(), icon },
      { onSuccess: onClose }
    );
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border rounded-lg bg-muted/30 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">ایجاد دسته‌بندی جدید</h4>
        <Button type="button" variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">نام کلید (انگلیسی)</Label>
          <Input
            id="name"
            placeholder="مثال: insurance"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="ltr"
            dir="ltr"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">عنوان نمایشی</Label>
          <Input
            id="label"
            placeholder="مثال: بیمه ساختمان"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label>آیکون</Label>
        <div className="flex flex-wrap gap-2">
          {emojiOptions.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              className={`w-10 h-10 text-xl rounded-md border-2 transition-colors ${
                icon === emoji 
                  ? "border-primary bg-primary/10" 
                  : "border-border hover:border-primary/50"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="submit" disabled={createCategory.isPending || !name.trim() || !label.trim()}>
          {createCategory.isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
              در حال ایجاد...
            </>
          ) : (
            "ایجاد دسته‌بندی"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          انصراف
        </Button>
      </div>
    </form>
  );
}
