import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Settings2 } from "lucide-react";
import { useCategoriesWithSettings } from "@/hooks/useExpenseCategories";
import { CategoryForm } from "./CategoryForm";
import { CategoryAllocationDialog } from "./CategoryAllocationDialog";
import type { CategoryWithSettings } from "@/hooks/useExpenseCategories";

const allocationLabels: Record<string, string> = {
  equal: "مساوی",
  by_area: "متراژ",
  by_residents: "نفرات",
  by_area_residents: "متراژ و نفرات",
  single_unit: "واحد خاص",
};

export function CategorySettings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithSettings | null>(null);
  
  const { data: categories = [], isLoading } = useCategoriesWithSettings();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            دسته‌بندی هزینه‌ها و نحوه تسهیم
          </CardTitle>
          <Button onClick={() => setShowForm(true)} size="sm">
            <Plus className="w-4 h-4 ml-2" />
            دسته جدید
          </Button>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6">
              <CategoryForm onClose={() => setShowForm(false)} />
            </div>
          )}
          
          <div className="grid gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{category.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{category.label}</h3>
                      {category.is_system && (
                        <Badge variant="secondary" className="text-xs">سیستمی</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {category.allocation_settings?.allowed_allocation_types.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {allocationLabels[type] || type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-left text-sm text-muted-foreground ml-4">
                    <span>پیش‌فرض: </span>
                    <span className="font-medium text-foreground">
                      {allocationLabels[category.allocation_settings?.default_allocation_type || 'equal']}
                    </span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedCategory(category)}
                  >
                    تنظیمات تسهیم
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedCategory && (
        <CategoryAllocationDialog
          category={selectedCategory}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  );
}
