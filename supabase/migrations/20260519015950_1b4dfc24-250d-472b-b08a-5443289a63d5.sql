
CREATE OR REPLACE FUNCTION public.cleanup_building_data()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.unit_occupancy_history WHERE building_id = OLD.id;
  DELETE FROM public.unit_storages WHERE building_id = OLD.id;
  DELETE FROM public.unit_vehicles WHERE building_id = OLD.id;
  DELETE FROM public.unit_charges WHERE building_id = OLD.id;
  DELETE FROM public.unit_module_access WHERE building_id = OLD.id;
  DELETE FROM public.unit_document_access_blocks WHERE building_id = OLD.id;
  DELETE FROM public.utility_readings WHERE building_id = OLD.id;
  DELETE FROM public.expense_unit_shares WHERE building_id = OLD.id;
  DELETE FROM public.expense_attachments WHERE building_id = OLD.id;
  DELETE FROM public.expenses WHERE building_id = OLD.id;
  DELETE FROM public.expense_categories WHERE building_id = OLD.id;
  DELETE FROM public.category_allocation_settings WHERE building_id = OLD.id;
  DELETE FROM public.payments WHERE building_id = OLD.id;
  DELETE FROM public.projects WHERE building_id = OLD.id;
  DELETE FROM public.managers WHERE building_id = OLD.id;
  DELETE FROM public.manager_roles WHERE building_id = OLD.id;
  DELETE FROM public.building_payment_policies WHERE building_id = OLD.id;
  DELETE FROM public.building_bank_accounts WHERE building_id = OLD.id;
  DELETE FROM public.building_contacts WHERE building_id = OLD.id;
  DELETE FROM public.building_announcements WHERE building_id = OLD.id;
  DELETE FROM public.building_poll_votes WHERE building_id = OLD.id;
  DELETE FROM public.building_polls WHERE building_id = OLD.id;
  DELETE FROM public.building_rules WHERE building_id = OLD.id;
  DELETE FROM public.building_meeting_minutes WHERE building_id = OLD.id;
  DELETE FROM public.building_messages WHERE building_id = OLD.id;
  DELETE FROM public.building_documents WHERE building_id = OLD.id;
  DELETE FROM public.reservations WHERE building_id = OLD.id;
  DELETE FROM public.reservation_venues WHERE building_id = OLD.id;
  DELETE FROM public.notification_reads WHERE building_id = OLD.id;
  DELETE FROM public.sms_logs WHERE building_id = OLD.id;
  DELETE FROM public.sms_settings WHERE building_id = OLD.id;
  DELETE FROM public.sms_templates WHERE building_id = OLD.id;
  DELETE FROM public.sms_credit_requests WHERE building_id = OLD.id;
  DELETE FROM public.support_ticket_messages WHERE building_id = OLD.id;
  DELETE FROM public.support_tickets WHERE building_id = OLD.id;
  DELETE FROM public.units WHERE building_id = OLD.id;
  DELETE FROM public.building_members WHERE building_id = OLD.id;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_cleanup_building_data ON public.buildings;
CREATE TRIGGER trg_cleanup_building_data
BEFORE DELETE ON public.buildings
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_building_data();

-- Backfill: clean up orphaned data from buildings already deleted
DELETE FROM public.unit_occupancy_history WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.unit_storages WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.unit_vehicles WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.unit_charges WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.unit_module_access WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.unit_document_access_blocks WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.utility_readings WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.expense_unit_shares WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.expense_attachments WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.expenses WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.expense_categories WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.category_allocation_settings WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.payments WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.projects WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.managers WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.manager_roles WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_payment_policies WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_bank_accounts WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_contacts WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_announcements WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_poll_votes WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_polls WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_rules WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_meeting_minutes WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_messages WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_documents WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.reservations WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.reservation_venues WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.notification_reads WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.sms_logs WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.sms_settings WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.sms_templates WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.sms_credit_requests WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.support_ticket_messages WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.support_tickets WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.units WHERE building_id NOT IN (SELECT id FROM public.buildings);
DELETE FROM public.building_members WHERE building_id NOT IN (SELECT id FROM public.buildings);
