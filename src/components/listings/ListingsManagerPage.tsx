import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useBuilding } from "@/contexts/BuildingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Image as ImageIcon, Upload, Trash2, MapPin, Home as HomeIcon, Edit } from "lucide-react";
import { useUnits } from "@/hooks/useUnits";

const DEAL_TYPES = ["فروش", "رهن-اجاره", "رهن کامل", "معاوضه"];
const PROPERTY_TYPES = ["آپارتمان", "ویلایی", "کلنگی", "مغازه", "اداری", "زمین"];
const DIRECTIONS = ["شمالی", "جنوبی", "شرقی", "غربی", "دو نبش", "سه نبش"];
const DOC_STATUS = ["تک‌برگ", "منگوله‌دار", "قولنامه‌ای", "وکالتی", "در حال صدور"];
const PROP_STATUS = ["تخلیه", "مسکونی", "اداری", "تجاری"];
const USAGE = ["مسکونی", "اداری", "تجاری", "آزاد"];
const CONSTRUCTION = ["نوساز", "بازسازی شده", "قدیمی"];

const AMENITIES: { key: string; label: string }[] = [
  { key: "has_gas", label: "گاز" },
  { key: "has_cooler", label: "کولر" },
  { key: "has_radiator", label: "شوفاژ" },
  { key: "has_fan_coil", label: "فن کویل" },
  { key: "has_package", label: "پکیج" },
  { key: "has_chiller", label: "چیلر" },
  { key: "is_penthouse", label: "پنت هاوس" },
  { key: "has_elevator", label: "آسانسور" },
  { key: "has_storage", label: "انباری" },
  { key: "has_balcony", label: "بالکن" },
  { key: "has_fireplace", label: "شومینه" },
  { key: "has_parking", label: "پارکینگ" },
  { key: "has_remote_door", label: "درب ریموت" },
  { key: "has_pool", label: "استخر" },
  { key: "has_sauna", label: "سونا" },
  { key: "has_jacuzzi", label: "جکوزی" },
  { key: "has_lobby", label: "لابی" },
  { key: "has_yard", label: "حیاط" },
  { key: "has_video_intercom", label: "آیفون تصویری" },
  { key: "has_security_system", label: "سیستم حفاظتی" },
  { key: "rent_to_student", label: "اجاره به دانشجو" },
  { key: "convertible_rent", label: "اجاره قابل تبدیل" },
  { key: "long_term_contract", label: "قرارداد بلند مدت" },
];

export function ListingsManagerPage() {
  const { data: units = [], isLoading } = useUnits();
  const [editUnitId, setEditUnitId] = useState<string | null>(null);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <BuildingLocationCard />
      <Card>
        <CardHeader><CardTitle>آگهی‌های ملک واحدها</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {units.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30">
                <div className="flex items-center gap-3">
                  <HomeIcon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-semibold">واحد {u.unit_number} {u.owner_name && `- ${u.owner_name}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.listing_active ? (
                        <span className="text-green-600 font-semibold">آگهی فعال</span>
                      ) : (
                        "بدون آگهی"
                      )}
                      {u.deal_type && ` • ${u.deal_type}`}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditUnitId(u.id)}>
                  <Edit className="w-4 h-4 ml-1" />ویرایش آگهی
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {editUnitId && (
        <ListingFormDialog
          unitId={editUnitId}
          onClose={() => setEditUnitId(null)}
        />
      )}
    </div>
  );
}

function BuildingLocationCard() {
  const { currentBuilding } = useBuilding();
  const qc = useQueryClient();
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setLat((currentBuilding as any)?.latitude?.toString() || "");
    setLng((currentBuilding as any)?.longitude?.toString() || "");
    setCity((currentBuilding as any)?.city || "");
  }, [currentBuilding]);

  const save = async () => {
    if (!currentBuilding) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("buildings")
        .update({
          latitude: lat ? Number(lat) : null,
          longitude: lng ? Number(lng) : null,
          city: city || null,
        } as any)
        .eq("id", currentBuilding.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["buildings"] });
      toast({ title: "ذخیره شد" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" />لوکیشن ساختمان</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-4">
        <div>
          <Label>شهر</Label>
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="تهران" />
        </div>
        <div>
          <Label>عرض جغرافیایی (Lat)</Label>
          <Input value={lat} onChange={(e) => setLat(e.target.value)} dir="ltr" placeholder="35.6892" />
        </div>
        <div>
          <Label>طول جغرافیایی (Lng)</Label>
          <Input value={lng} onChange={(e) => setLng(e.target.value)} dir="ltr" placeholder="51.389" />
        </div>
        <div className="flex items-end">
          <Button onClick={save} className="w-full" disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-1" />ذخیره</>}</Button>
        </div>
        <p className="md:col-span-4 text-xs text-muted-foreground">
          مختصات را می‌توانید از Google Maps با راست کلیک روی موقعیت ساختمان دریافت کنید.
        </p>
      </CardContent>
    </Card>
  );
}

function ListingFormDialog({ unitId, onClose }: { unitId: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [form, setForm] = useState<any>({});
  const [photos, setPhotos] = useState<{ id: string; file_path: string; url?: string }[]>([]);
  const [uploading, setUploading] = useState(false);

  const { data: unit, isLoading } = useQuery({
    queryKey: ["unit-listing", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("units").select("*").eq("id", unitId).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (unit) setForm(unit);
  }, [unit]);

  const loadPhotos = async () => {
    const { data } = await supabase
      .from("unit_listing_photos" as any)
      .select("id, file_path")
      .eq("unit_id", unitId)
      .order("sort_order");
    const withUrls = await Promise.all(
      (data || []).map(async (p: any) => {
        const { data: s } = await supabase.storage.from("unit-listings").createSignedUrl(p.file_path, 3600);
        return { ...p, url: s?.signedUrl };
      })
    );
    setPhotos(withUrls);
  };

  useEffect(() => { loadPhotos(); }, [unitId]);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: async () => {
      const { id, created_at, updated_at, building_id, ...payload } = form;
      const { error } = await supabase
        .from("units")
        .update({ ...payload, listing_updated_at: new Date().toISOString() })
        .eq("id", unitId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "ذخیره شد" });
      qc.invalidateQueries({ queryKey: ["units"] });
      qc.invalidateQueries({ queryKey: ["unit-listing", unitId] });
    },
    onError: (e: any) => toast({ title: "خطا", description: e.message, variant: "destructive" }),
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !unit) return;
    setUploading(true);
    try {
      for (const file of Array.from(e.target.files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${unit.building_id}/${unitId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("unit-listings").upload(fileName, file);
        if (upErr) throw upErr;
        await supabase.from("unit_listing_photos" as any).insert({
          building_id: unit.building_id,
          unit_id: unitId,
          file_path: fileName,
          file_name: file.name,
        });
      }
      await loadPhotos();
      toast({ title: "عکس‌ها آپلود شد" });
    } catch (e: any) {
      toast({ title: "خطا", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoId: string, filePath: string) => {
    await supabase.storage.from("unit-listings").remove([filePath]);
    await supabase.from("unit_listing_photos" as any).delete().eq("id", photoId);
    await loadPhotos();
  };

  if (isLoading) return null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>آگهی واحد {unit?.unit_number}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg">
            <div>
              <p className="font-semibold">نمایش آگهی به مشاورین</p>
              <p className="text-xs text-muted-foreground">با فعال‌سازی، اطلاعات این واحد در پورتال مشاورین قابل مشاهده خواهد بود.</p>
            </div>
            <Switch checked={!!form.listing_active} onCheckedChange={(v) => set("listing_active", v)} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field label="کد ملک"><Input value={form.property_code || ""} onChange={(e) => set("property_code", e.target.value)} /></Field>
            <Field label="نوع ملک">
              <Select value={form.property_type || ""} onValueChange={(v) => set("property_type", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="نوع معامله">
              <Select value={form.deal_type || ""} onValueChange={(v) => set("deal_type", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{DEAL_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="نوع ساخت">
              <Select value={form.construction_type || ""} onValueChange={(v) => set("construction_type", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{CONSTRUCTION.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="سن بنا (سال)"><Input type="number" value={form.building_age ?? ""} onChange={(e) => set("building_age", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="تعداد خواب"><Input type="number" value={form.bedrooms ?? ""} onChange={(e) => set("bedrooms", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="موقعیت">
              <Select value={form.direction || ""} onValueChange={(v) => set("direction", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{DIRECTIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="تعداد طبقات"><Input type="number" value={form.total_floors ?? ""} onChange={(e) => set("total_floors", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="واحد در هر طبقه"><Input type="number" value={form.units_per_floor ?? ""} onChange={(e) => set("units_per_floor", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="وضعیت سند">
              <Select value={form.document_status || ""} onValueChange={(v) => set("document_status", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{DOC_STATUS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="کاربری">
              <Select value={form.usage_type || ""} onValueChange={(v) => set("usage_type", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{USAGE.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="وضعیت ملک">
              <Select value={form.property_status || ""} onValueChange={(v) => set("property_status", v)}>
                <SelectTrigger><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
                <SelectContent>{PROP_STATUS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="نما"><Input value={form.facade || ""} onChange={(e) => set("facade", e.target.value)} /></Field>
            <Field label="کف"><Input value={form.floor_material || ""} onChange={(e) => set("floor_material", e.target.value)} /></Field>
            <Field label="آشپزخانه"><Input value={form.kitchen || ""} onChange={(e) => set("kitchen", e.target.value)} /></Field>
            <Field label="کابینت"><Input value={form.cabinet || ""} onChange={(e) => set("cabinet", e.target.value)} /></Field>
            <Field label="سرویس بهداشتی"><Input value={form.bathroom || ""} onChange={(e) => set("bathroom", e.target.value)} /></Field>
            <Field label="متراژ انباری"><Input type="number" step="0.1" value={form.storage_area ?? ""} onChange={(e) => set("storage_area", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="متراژ بالکن"><Input type="number" step="0.1" value={form.balcony_area ?? ""} onChange={(e) => set("balcony_area", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="تعداد خط تلفن"><Input type="number" value={form.phone_lines ?? ""} onChange={(e) => set("phone_lines", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="حداکثر ساکنین"><Input type="number" value={form.max_residents ?? ""} onChange={(e) => set("max_residents", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="وام (ریال)"><Input type="number" value={form.loan_amount ?? ""} onChange={(e) => set("loan_amount", e.target.value ? +e.target.value : null)} /></Field>
            <Field label="تحویل"><Input value={form.delivery_time || ""} onChange={(e) => set("delivery_time", e.target.value)} /></Field>
          </div>

          {/* Amenities */}
          <Card>
            <CardHeader><CardTitle className="text-base">امکانات</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {AMENITIES.map((a) => (
                <label key={a.key} className="flex items-center gap-2 cursor-pointer p-1 hover:bg-accent/30 rounded">
                  <Checkbox checked={!!form[a.key]} onCheckedChange={(v) => set(a.key, !!v)} />
                  <span className="text-sm">{a.label}</span>
                </label>
              ))}
            </CardContent>
          </Card>

          {/* Prices */}
          <Card>
            <CardHeader><CardTitle className="text-base">قیمت‌ها (ریال)</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Field label="رهن"><Input type="number" value={form.deposit_rial ?? ""} onChange={(e) => set("deposit_rial", e.target.value ? +e.target.value : null)} /></Field>
              <Field label="اجاره"><Input type="number" value={form.rent_rial ?? ""} onChange={(e) => set("rent_rial", e.target.value ? +e.target.value : null)} /></Field>
              <Field label="قیمت متری"><Input type="number" value={form.price_per_meter_rial ?? ""} onChange={(e) => set("price_per_meter_rial", e.target.value ? +e.target.value : null)} /></Field>
              <Field label="قیمت کل"><Input type="number" value={form.total_price_rial ?? ""} onChange={(e) => set("total_price_rial", e.target.value ? +e.target.value : null)} /></Field>
            </CardContent>
          </Card>

          <Field label="توضیحات">
            <Textarea rows={3} value={form.listing_description || ""} onChange={(e) => set("listing_description", e.target.value)} />
          </Field>

          {/* Photos */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="w-4 h-4" />عکس‌های واحد</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative group">
                    <img src={p.url} alt="" className="w-full h-24 object-cover rounded border" />
                    <Button size="icon" variant="destructive" className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => deletePhoto(p.id, p.file_path)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <label className="block">
                <input type="file" multiple accept="image/*" onChange={handleUpload} disabled={uploading} className="hidden" id="photo-upload" />
                <Button asChild variant="outline" disabled={uploading}>
                  <span><Upload className="w-4 h-4 ml-1" />{uploading ? "در حال آپلود..." : "افزودن عکس"}</span>
                </Button>
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>انصراف</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 ml-1" />ذخیره</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
