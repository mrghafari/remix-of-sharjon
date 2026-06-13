
## خلاصه

سیستم اشتراک بر اساس «تعداد واحد قابل مدیریت» با مدت اعتبار مشخص. مدیر در پایین ساید‌بار روزهای باقیمانده و سقف واحد مصرفی را می‌بیند و دکمهٔ خرید/تمدید دارد. سوپر ادمین پلن‌ها را تعریف می‌کند، اعتبار باقیمانده هر مشتری، مبالغ پرداختی و درآمد کل را در پنل ادمین می‌بیند.

## مدل داده (Migration)

**`subscription_plans`** (سوپر ادمین مدیریت می‌کند):
- `name`, `unit_quota` (تعداد واحد مجاز)، `duration_days` (مثلاً ۳۶۵)، `price_rial`، `is_active`، `sort_order`

**`customer_subscriptions`** (اشتراک فعال هر مدیر):
- `user_id`, `plan_id`, `unit_quota`, `starts_at`, `expires_at`, `is_active`

**`subscription_payments`** (سوابق پرداخت — برای درآمد شرکت):
- `user_id`, `plan_id`, `amount_rial`, `payment_date`, `gateway` (`zarinpal`)، `authority`، `ref_id`، `status` (`pending|paid|failed`)، `subscription_id`

GRANTs کامل + RLS: مدیر فقط ردیف‌های خودش، سوپر ادمین همه.

**RPCs:**
- `get_my_subscription()` → روزهای باقیمانده + سقف واحد + مصرف فعلی
- `get_admin_subscription_overview()` → برای جدول مشتریان (روز باقیمانده، سقف، مصرف، کل پرداختی)
- `get_company_revenue(_from, _to)` → جمع درآمد + breakdown ماهانه

## بک‌اند

**Edge Functions جدید:**
- `subscription-payment-init` — ایجاد رکورد pending + درخواست به زرین‌پال + redirect
- `subscription-payment-callback` — تأیید زرین‌پال، فعال‌سازی اشتراک (تمدید = اضافه شدن `duration_days` به `expires_at` فعلی اگر هنوز فعال است وگرنه از `now()`)
- secret لازم: `ZARINPAL_MERCHANT_ID`

## فرانت‌اند

**ساید‌بار مدیر** (`src/components/layout/Sidebar.tsx`):
کارت کوچک در پایین: «۲۸۷ روز باقیمانده» + «۲۴ از ۳۰ واحد» + دکمهٔ «تمدید/خرید اعتبار» با badge قرمز اگر ≤۱۵ روز.

**صفحهٔ خرید اعتبار** (`/subscription`):
نمایش پلن‌ها به صورت کارت، انتخاب و انتقال به درگاه. نمایش تاریخچهٔ پرداخت‌ها.

**پنل ادمین:**
1. تب جدید «پلن‌ها» (`AdminPlans.tsx`) — CRUD روی `subscription_plans`
2. تب جدید «درآمد» (`AdminRevenue.tsx`) — کارت‌های آماری (کل درآمد، این ماه، تعداد اشتراک فعال)، چارت ماهانه، جدول پرداخت‌ها با فیلتر تاریخ
3. در تب «مشتریان» (`AdminCustomers.tsx`) دو ستون اضافه: «روز باقیمانده»، «کل پرداختی»

## محدودسازی (Enforcement)

تابع `enforce_unit_quota()` به صورت trigger روی `units` INSERT:
- جمع کل واحدهای ساختمان‌های مدیر را با `unit_quota` اشتراک فعال مقایسه می‌کند
- در صورت تجاوز یا انقضا → `RAISE EXCEPTION 'سقف اعتبار شما پر شده است. لطفاً اعتبار خود را تمدید کنید.'`
- سوپر ادمین مستثنی است

## مراحل اجرا

1. Migration (جداول + GRANT + RLS + RPC + trigger)
2. درخواست secret زرین‌پال
3. Edge functions
4. کامپوننت ساید‌بار + صفحهٔ `/subscription`
5. تب‌های ادمین (پلن‌ها، درآمد) + ستون‌های مشتریان
6. به‌روزرسانی memory
