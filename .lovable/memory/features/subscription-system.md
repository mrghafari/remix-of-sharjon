---
name: Subscription & Credit System
description: Unit-based subscription plans, manager sidebar credit card, admin plans/revenue tabs, ZarinPal payment flow
type: feature
---
# Subscription System

Tables: `subscription_plans` (managed by super admin: name, unit_quota, duration_days, price_rial), `customer_subscriptions` (user_id, unit_quota, expires_at), `subscription_payments` (status: pending/paid/failed, gateway=zarinpal).

RPCs: `get_my_subscription` (used by sidebar card and SubscriptionPage), `get_admin_subscription_overview` (added to AdminCustomers table), `get_company_revenue` (AdminRevenue dashboard).

Enforcement: `enforce_unit_quota` trigger blocks unit INSERT when manager's active subscription expired or unit count >= quota. Super admin bypasses.

Edge functions:
- `subscription-payment-init` — verifies user, creates pending payment, calls ZarinPal v4 request, returns redirect URL. When `ZARINPAL_MERCHANT_ID` is unset, runs sandbox mode (auto-marks paid).
- `subscription-payment-callback` (verify_jwt=false) — verifies ZarinPal, extends existing active subscription by `duration_days` or creates new; redirects to `/dashboard?tab=subscription&payment=ok|failed`.

Renewal logic: if active subscription exists, expires_at += plan.duration_days and quota = max(existing, plan). Otherwise creates fresh.

Sidebar: `SidebarSubscriptionCard` at bottom shows days remaining + units used/quota; red when ≤15 days. Clicking sets tab to `subscription`.

Initial setup: existing managers were granted 30-day trial with 1000-unit quota so the app continues working.
