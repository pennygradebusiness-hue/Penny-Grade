-- Keep paid or still-payable orders from being marked cancelled until a refund
-- has been issued and tracked explicitly.
CREATE OR REPLACE FUNCTION public.prevent_unrefunded_order_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_status = 'CANCELLED' AND OLD.order_status IS DISTINCT FROM NEW.order_status THEN
    RAISE EXCEPTION 'Order cancellation requires the refund workflow';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unrefunded_order_cancellation ON public.membership_orders;
CREATE TRIGGER trg_prevent_unrefunded_order_cancellation
  BEFORE UPDATE OF order_status ON public.membership_orders
  FOR EACH ROW EXECUTE FUNCTION public.prevent_unrefunded_order_cancellation();
