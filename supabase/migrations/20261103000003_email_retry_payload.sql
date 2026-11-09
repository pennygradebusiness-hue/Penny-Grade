-- Preserve the rendered message so admin retries can resend the same email
-- payload with the same provider idempotency key.
ALTER TABLE public.email_notifications
  ADD COLUMN IF NOT EXISTS html_body text;
