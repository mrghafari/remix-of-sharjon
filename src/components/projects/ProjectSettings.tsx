import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, FolderKanban, Loader2 } from "lucide-react";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { ProjectFormDialog } from "./ProjectFormDialog";
import type { Project } from "@/hooks/useProjects";
import { formatJalaliDate } from "@/lib/jalaliDate";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatNumber = (num: number) => {
  return new Intl.NumberFormat("fa-IR").format(Math.round(num));
};

export function ProjectSettings() {
  const [showForm, setShowForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setShowForm(true);
  };

  const handleAdd = () => {
    setSelectedProject(null);
    setShowForm(true);
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      deleteProject.mutate(projectToDelete.id, {
        onSuccess: () => {
          setDeleteDialogOpen(false);
          setProjectToDelete(null);
        },
      });
    }
  };

  return (
    <>
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-primary" />
            <CardTitle>مدیریت پروژه‌ها</CardTitle>
          </div>
          <Button onClick={handleAdd} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            پروژه جدید
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>هنوز پروژه‌ای ثبت نشده است</p>
              <p className="text-sm mt-1">برای شروع، یک پروژه جدید اضافه کنید</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">نام پروژه</TableHead>
                  <TableHead className="text-right">بودجه</TableHead>
                  <TableHead className="text-right">تاریخ شروع</TableHead>
                  <TableHead className="text-right">تاریخ پایان</TableHead>
                  <TableHead className="text-right">وضعیت</TableHead>
                  <TableHead className="text-right">عملیات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{project.name}</p>
                        {project.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {project.budget ? (
                        <span className="font-medium">{formatNumber(project.budget)} تومان</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {project.start_date ? formatJalaliDate(project.start_date) : "-"}
                    </TableCell>
                    <TableCell>
                      {project.end_date ? formatJalaliDate(project.end_date) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={project.is_active ? "default" : "secondary"}>
                          {project.is_active ? "فعال" : "غیرفعال"}
                        </Badge>
                        {project.apply_manager_discount && (
                          <Badge variant="outline" className="text-xs">
                            تخفیف مدیر ✓
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(project)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(project)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProjectFormDialog
        open={showForm}
        onOpenChange={setShowForm}
        project={selectedProject}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف پروژه</AlertDialogTitle>
            <AlertDialogDescription>
              آیا از حذف پروژه «{projectToDelete?.name}» اطمینان دارید؟ این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
