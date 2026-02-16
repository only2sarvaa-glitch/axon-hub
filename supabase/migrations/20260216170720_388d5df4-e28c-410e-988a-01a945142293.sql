
-- Make notification insert policy require authentication
DROP POLICY IF EXISTS "Authenticated insert notifications" ON public.notifications;
CREATE POLICY "Authenticated insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
