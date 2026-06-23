import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2, Search, MapPin, Phone, Home, Loader2, LogOut, Map as MapIcon, List, BedDouble, Ruler, Layers } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon paths (Vite)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const fmt = (n: number | null | undefined) => (n == null ? "—" : Math.round(Number(n)).toLocaleString("fa-IR"));

interface Listing {
  unit_id: string;
  building_id: string;
  building_name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  unit_number: string | null;
  area: number | null;
  floor: number | null;
  bedrooms: number | null;
  property_code: string | null;
  property_type: string | null;
  deal_type: string | null;
  direction: string | null;
  property_status: string | null;
  document_status: string | null;
  deposit_rial: number | null;
  rent_rial: number | null;
  total_price_rial: number | null;
  price_per_meter_rial: number | null;
  listing_description: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  photo_count: number;
  listing_updated_at: string | null;
}

export default function AgentPortal() {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [dealType, setDealType] = useState("");
  const [city, setCity] = useState("");
  const [minArea, setMinArea] = useState("");
  const [maxArea, setMaxArea] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [detail, setDetail] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [view, setView] = useState<"list" | "map">("list");

  // Check agent status
  const { data: agent, isLoading: agentLoading } = useQuery({
    queryKey: ["agent-self", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("real_estate_agents" as any)
        .select("status, full_name, agency_name")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as any;
    },
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/agent-auth");
  }, [user, authLoading, navigate]);

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ["agent-listings", q, dealType, city, minArea, maxArea, minBeds, minPrice, maxPrice],
    enabled: !!user && agent?.status === "approved",
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("agent_search_listings", {
        _query: q || null,
        _deal_type: dealType || null,
        _city: city || null,
        _min_area: minArea ? Number(minArea) : null,
        _max_area: maxArea ? Number(maxArea) : null,
        _min_bedrooms: minBeds ? Number(minBeds) : null,
        _min_price: minPrice ? Number(minPrice) : null,
        _max_price: maxPrice ? Number(maxPrice) : null,
      });
      if (error) throw error;
      return (data || []) as Listing[];
    },
  });

  const openDetail = async (l: Listing) => {
    setDetail(l);
    const { data } = await supabase
      .from("unit_listing_photos" as any)
      .select("file_path")
      .eq("unit_id", l.unit_id)
      .order("sort_order", { ascending: true });
    const urls = await Promise.all(
      (data || []).map(async (p: any) => {
        const { data: signed } = await supabase.storage
          .from("unit-listings")
          .createSignedUrl(p.file_path, 3600);
        return signed?.signedUrl || "";
      })
    );
    setPhotos(urls.filter(Boolean));
  };

  const mapCenter = useMemo<[number, number]>(() => {
    const withCoord = listings.filter((l) => l.latitude && l.longitude);
    if (withCoord.length === 0) return [35.6892, 51.389]; // Tehran
    const lat = withCoord.reduce((s, l) => s + Number(l.latitude), 0) / withCoord.length;
    const lng = withCoord.reduce((s, l) => s + Number(l.longitude), 0) / withCoord.length;
    return [lat, lng];
  }, [listings]);

  if (authLoading || agentLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (agent?.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" dir="rtl">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>دسترسی محدود</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p>حساب شما در وضعیت <Badge>{agent?.status === "pending" ? "در انتظار تأیید" : "رد شده"}</Badge> است.</p>
            <Button onClick={() => { signOut(); navigate("/agent-auth"); }} variant="outline">
              <LogOut className="w-4 h-4 ml-2" />خروج
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="w-7 h-7 text-primary" />
            <div>
              <h1 className="font-bold">پورتال مشاورین املاک</h1>
              <p className="text-xs text-muted-foreground">{agent?.full_name} {agent?.agency_name && `• ${agent.agency_name}`}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/agent-auth"); }}>
            <LogOut className="w-4 h-4 ml-1" />خروج
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-4">
        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input placeholder="جستجو در نام، آدرس، توضیحات، کد ملک..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-10" />
            </div>
            <Select value={dealType || "all"} onValueChange={(v) => setDealType(v === "all" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="نوع معامله" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">همه</SelectItem>
                <SelectItem value="فروش">فروش</SelectItem>
                <SelectItem value="رهن-اجاره">رهن و اجاره</SelectItem>
                <SelectItem value="رهن کامل">رهن کامل</SelectItem>
                <SelectItem value="معاوضه">معاوضه</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="شهر" value={city} onChange={(e) => setCity(e.target.value)} />
            <Input placeholder="حداقل متراژ" value={minArea} onChange={(e) => setMinArea(e.target.value)} type="number" />
            <Input placeholder="حداکثر متراژ" value={maxArea} onChange={(e) => setMaxArea(e.target.value)} type="number" />
            <Input placeholder="حداقل خواب" value={minBeds} onChange={(e) => setMinBeds(e.target.value)} type="number" />
            <Input placeholder="حداقل قیمت (ریال)" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} type="number" />
            <Input placeholder="حداکثر قیمت (ریال)" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} type="number" />
          </CardContent>
        </Card>

        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="list" className="gap-1"><List className="w-4 h-4" />لیست ({listings.length})</TabsTrigger>
              <TabsTrigger value="map" className="gap-1"><MapIcon className="w-4 h-4" />نقشه</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="list" className="mt-4">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : listings.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">آگهی یافت نشد</CardContent></Card>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <Card key={l.unit_id} className="hover:shadow-lg transition cursor-pointer" onClick={() => openDetail(l)}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{l.building_name} {l.unit_number && `- واحد ${l.unit_number}`}</h3>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />{l.city || ""} {l.address || ""}
                          </p>
                        </div>
                        {l.deal_type && <Badge variant="secondary">{l.deal_type}</Badge>}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {l.area && <span className="flex items-center gap-1"><Ruler className="w-3 h-3" />{fmt(l.area)} م²</span>}
                        {l.bedrooms != null && <span className="flex items-center gap-1"><BedDouble className="w-3 h-3" />{l.bedrooms} خواب</span>}
                        {l.floor != null && <span className="flex items-center gap-1"><Layers className="w-3 h-3" />طبقه {l.floor}</span>}
                      </div>
                      <div className="pt-2 border-t text-sm">
                        {l.deal_type === "فروش" && l.total_price_rial ? (
                          <p className="font-bold text-primary">{fmt(l.total_price_rial)} ریال</p>
                        ) : (
                          <div className="space-y-0.5">
                            {l.deposit_rial != null && <p>رهن: <span className="font-semibold">{fmt(l.deposit_rial)}</span> ریال</p>}
                            {l.rent_rial != null && <p>اجاره: <span className="font-semibold">{fmt(l.rent_rial)}</span> ریال</p>}
                          </div>
                        )}
                      </div>
                      {l.photo_count > 0 && <Badge variant="outline" className="text-xs">{l.photo_count} عکس</Badge>}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="map" className="mt-4">
            <div className="h-[600px] rounded-lg overflow-hidden border">
              <MapContainer center={mapCenter} zoom={12} className="h-full w-full">
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {listings.filter(l => l.latitude && l.longitude).map((l) => (
                  <Marker key={l.unit_id} position={[Number(l.latitude), Number(l.longitude)]}>
                    <Popup>
                      <div className="text-sm space-y-1" dir="rtl">
                        <p className="font-bold">{l.building_name}</p>
                        <p>{l.address}</p>
                        {l.deal_type && <Badge variant="secondary">{l.deal_type}</Badge>}
                        <Button size="sm" className="w-full mt-2" onClick={() => openDetail(l)}>جزئیات</Button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && (setDetail(null), setPhotos([]))}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.building_name} {detail.unit_number && `- واحد ${detail.unit_number}`}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noopener noreferrer">
                        <img src={src} alt="" className="w-full h-32 object-cover rounded border" />
                      </a>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {detail.property_code && <Field label="کد ملک" value={detail.property_code} />}
                  {detail.property_type && <Field label="نوع ملک" value={detail.property_type} />}
                  {detail.deal_type && <Field label="نوع معامله" value={detail.deal_type} />}
                  {detail.area && <Field label="متراژ" value={`${fmt(detail.area)} م²`} />}
                  {detail.bedrooms != null && <Field label="خواب" value={String(detail.bedrooms)} />}
                  {detail.floor != null && <Field label="طبقه" value={String(detail.floor)} />}
                  {detail.direction && <Field label="موقعیت" value={detail.direction} />}
                  {detail.document_status && <Field label="وضعیت سند" value={detail.document_status} />}
                  {detail.property_status && <Field label="وضعیت ملک" value={detail.property_status} />}
                  {detail.city && <Field label="شهر" value={detail.city} />}
                </div>
                {detail.address && (
                  <div className="bg-muted/50 p-3 rounded text-sm">
                    <p className="font-semibold flex items-center gap-1"><MapPin className="w-4 h-4" />آدرس</p>
                    <p className="text-muted-foreground mt-1">{detail.address}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {detail.deposit_rial != null && <PriceBox label="رهن" value={detail.deposit_rial} />}
                  {detail.rent_rial != null && <PriceBox label="اجاره" value={detail.rent_rial} />}
                  {detail.total_price_rial != null && <PriceBox label="قیمت کل" value={detail.total_price_rial} highlight />}
                  {detail.price_per_meter_rial != null && <PriceBox label="قیمت متری" value={detail.price_per_meter_rial} />}
                </div>
                {detail.listing_description && (
                  <div className="bg-accent/30 p-3 rounded text-sm">
                    <p className="font-semibold mb-1">توضیحات</p>
                    <p className="text-muted-foreground whitespace-pre-wrap">{detail.listing_description}</p>
                  </div>
                )}
                {detail.owner_name && (
                  <div className="bg-primary/5 border border-primary/20 p-3 rounded">
                    <p className="text-xs text-muted-foreground">اطلاعات تماس مالک</p>
                    <p className="font-semibold mt-1">{detail.owner_name}</p>
                    {detail.owner_phone && (
                      <a href={`tel:${detail.owner_phone}`} className="text-primary flex items-center gap-1 mt-1 font-mono" dir="ltr">
                        <Phone className="w-4 h-4" />{detail.owner_phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold">{value}</p>
    </div>
  );
}

function PriceBox({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded border ${highlight ? "bg-primary/10 border-primary/30" : "bg-muted/30"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${highlight ? "text-primary text-lg" : ""}`}>{fmt(value)} ریال</p>
    </div>
  );
}
