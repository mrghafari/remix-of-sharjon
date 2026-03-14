import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useContacts, useCreateContact, useUpdateContact, useDeleteContact, Contact } from "@/hooks/useContacts";
import { useBuilding } from "@/contexts/BuildingContext";
import { Plus, Trash2, Pencil, Phone, Star, Search, BookUser, Loader2 } from "lucide-react";

const specialties = [
  "لوله‌کش", "برقکار", "نقاش", "کولرکار", "تعمیرکار آسانسور",
  "جوشکار", "شیشه‌بر", "کلیدساز", "نظافتچی", "باغبان",
  "تعمیرکار لوازم خانگی", "فنی ساختمان", "آهنگر", "کابینت‌ساز", "سایر",
];

function StarRating({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(i === value ? 0 : i)}
          className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
        >
          <Star
            className={`w-5 h-5 ${i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
          />
        </button>
      ))}
    </div>
  );
}

export function PhoneBookPage() {
  const { currentBuildingId } = useBuilding();
  const { data: contacts = [], isLoading } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formSpecialty, setFormSpecialty] = useState("سایر");
  const [formRating, setFormRating] = useState(0);
  const [formDesc, setFormDesc] = useState("");

  const openAdd = () => {
    setEditContact(null);
    setFormName(""); setFormPhone(""); setFormSpecialty("سایر"); setFormRating(0); setFormDesc("");
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setFormName(c.name); setFormPhone(c.phone); setFormSpecialty(c.specialty); setFormRating(c.rating); setFormDesc(c.description || "");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!currentBuildingId || !formName || !formPhone) return;
    const data = {
      building_id: currentBuildingId,
      name: formName,
      phone: formPhone,
      specialty: formSpecialty,
      rating: formRating,
      description: formDesc || null,
    };
    if (editContact) {
      updateContact.mutate({ id: editContact.id, ...data }, { onSuccess: () => setDialogOpen(false) });
    } else {
      createContact.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  const filtered = useMemo(() => {
    let list = contacts;
    if (filterSpecialty !== "all") list = list.filter(c => c.specialty === filterSpecialty);
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(s) || c.phone.includes(s) || c.specialty.toLowerCase().includes(s));
    }
    return list;
  }, [contacts, filterSpecialty, search]);

  // Unique specialties from data
  const usedSpecialties = useMemo(() => {
    const set = new Set(contacts.map(c => c.specialty).filter(Boolean));
    return Array.from(set).sort();
  }, [contacts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <BookUser className="w-7 h-7 text-primary" />
            دفترچه تلفن
          </h1>
          <p className="text-muted-foreground mt-1">لیست مخاطبین و متخصصین ساختمان</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-5 h-5" />
          افزودن مخاطب
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap gap-3 animate-fade-in">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="جستجو نام، شماره یا تخصص..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
          <SelectTrigger className="w-48"><SelectValue placeholder="فیلتر تخصص" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه تخصص‌ها</SelectItem>
            {usedSpecialties.map(s => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3 animate-fade-in">
        <Card variant="stats">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">تعداد مخاطبین</p>
            <p className="text-2xl font-bold mt-1">{contacts.length}</p>
          </CardContent>
        </Card>
        <Card variant="stats">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">تخصص‌ها</p>
            <p className="text-2xl font-bold mt-1">{usedSpecialties.length}</p>
          </CardContent>
        </Card>
        <Card variant="stats">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">میانگین امتیاز</p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-2xl font-bold">
                {contacts.length > 0
                  ? (contacts.reduce((s, c) => s + c.rating, 0) / contacts.filter(c => c.rating > 0).length || 0).toFixed(1)
                  : "—"}
              </p>
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contacts Table */}
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle>لیست مخاطبین</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {contacts.length === 0 ? "هنوز مخاطبی ثبت نشده است" : "نتیجه‌ای یافت نشد"}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>نام</TableHead>
                  <TableHead>شماره تماس</TableHead>
                  <TableHead>تخصص</TableHead>
                  <TableHead>امتیاز</TableHead>
                  <TableHead>توضیحات</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell dir="ltr" className="text-left">
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-primary hover:underline">
                        <Phone className="w-3.5 h-3.5" />
                        {c.phone}
                      </a>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium">
                        {c.specialty || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StarRating value={c.rating} readonly />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{c.description || "—"}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editContact ? "ویرایش مخاطب" : "افزودن مخاطب جدید"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <label className="text-sm font-medium mb-1 block">نام *</label>
              <Input value={formName} onChange={e => setFormName(e.target.value)} placeholder="نام و نام خانوادگی" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">شماره تماس *</label>
              <Input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="09123456789" dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">تخصص</label>
              <Select value={formSpecialty} onValueChange={setFormSpecialty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {specialties.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">امتیاز عملکرد</label>
              <StarRating value={formRating} onChange={setFormRating} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">توضیحات</label>
              <Input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="توضیحات اختیاری" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>انصراف</Button>
            <Button
              onClick={handleSubmit}
              disabled={!formName || !formPhone || createContact.isPending || updateContact.isPending}
            >
              {(createContact.isPending || updateContact.isPending) && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              {editContact ? "ذخیره" : "افزودن"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف مخاطب</AlertDialogTitle>
            <AlertDialogDescription>آیا از حذف این مخاطب اطمینان دارید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) { deleteContact.mutate(deleteId); setDeleteId(null); } }}>
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
