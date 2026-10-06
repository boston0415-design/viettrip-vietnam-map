# Reply Web Push

The `chat-push` Supabase Edge Function and `chat_reply_push` database trigger send encrypted Web Push notifications for replies. Members opt in on each device using the existing private device capability. Public member IDs and nicknames cannot register subscriptions or mark another member's inbox read.

## Deployment

- Migration: `supabase/migrations/20261006144931_server_reply_push.sql`.
- Edge Function: `supabase/functions/chat-push/index.ts`.
- VAPID keys are generated once on the server and stored in a service-role-only RLS table. No private keys are in the frontend or Git.
- JWT gateway verification is disabled because routes implement custom auth: private device capability for subscriber actions, random 256-bit dispatch secret for delivery; `/config` intentionally returns only a public key.
- Immediate pg_net webhook plus a once-per-minute retry job. Each delivery is leased atomically for two minutes; maximum five attempts. Invalid/expired endpoints (404/410) are removed.
- Inbox and delivery rows cascade with existing seven-day chat retention. No existing review or place data is modified.

## User experience and limits

`답장 알림 켜기` requests permission only after a tap. The service worker displays a generic reply notice with the sender nickname (no chat body). Clicking focuses/opens the relevant conversation. Read replies are acknowledged on the server and their notifications are removed on that device. Badge API use is feature-detected; Android launcher dots/counts and iOS notification settings are platform controlled.

Do not claim silent push support: every push must display a notification. Closed-app delivery requires permission, an active subscription, OS/browser background support, and network access. Device power restrictions can delay it. iOS requires a supported home-screen web app. Registration and API/worker tests pass; actual handset delivery requires the user's permission and remains unverified until a device subscribes.

## Operations

Inspect only aggregate subscription/inbox/delivery counts; never print subscription endpoints, device credentials, dispatch secret, or VAPID private key. Health check: public `/config` returns 200 with a public key; authenticated `/dispatch` processes an empty queue successfully, unauthenticated `/dispatch` returns 401. Never send test messages into the production public chat.
