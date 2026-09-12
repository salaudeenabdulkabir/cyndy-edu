CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_claim_until" timestamp;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "email_next_attempt_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_dedupe_key_unique" UNIQUE("dedupe_key");--> statement-breakpoint
CREATE FUNCTION cyndy_audit_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE item jsonb;
BEGIN
  item := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  INSERT INTO audit_events(entity_type,entity_id,action)
    VALUES(TG_TABLE_NAME,COALESCE(item->>'id',item->>'key','unknown'),lower(TG_OP));
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION cyndy_queue_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE recipient uuid; app_id uuid; kind notification_type; heading text;
BEGIN
  IF TG_TABLE_NAME = 'applications' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      recipient := NEW.client_id; app_id := NEW.id; kind := 'status_update'; heading := 'Application status updated';
    END IF;
    IF NEW.assigned_worker_id IS NOT NULL AND NEW.assigned_worker_id IS DISTINCT FROM OLD.assigned_worker_id THEN
      INSERT INTO notifications(recipient_id,application_id,type,title,message)
        VALUES(NEW.assigned_worker_id,NEW.id,'assignment','An application has been assigned to you','Sign in to view your assigned application.');
    END IF;
  ELSIF TG_TABLE_NAME = 'client_packages' THEN
    IF NEW.payment_confirmed = true AND OLD.payment_confirmed IS DISTINCT FROM true THEN
      recipient := NEW.client_id; kind := 'payment_confirmed'; heading := 'Payment confirmed';
    END IF;
  ELSIF TG_TABLE_NAME = 'payment_receipts' THEN
    IF NEW.rejection_reason IS NOT NULL AND NEW.rejection_reason IS DISTINCT FROM OLD.rejection_reason THEN
      recipient := NEW.client_id; kind := 'payment_rejected'; heading := 'Payment receipt needs attention';
    END IF;
  ELSIF TG_TABLE_NAME = 'application_documents' THEN
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('verified','rejected') THEN
    SELECT client_id INTO recipient FROM applications WHERE id=NEW.application_id;
    app_id := NEW.application_id; kind := CASE WHEN NEW.status='verified' THEN 'doc_verified'::notification_type ELSE 'doc_rejected'::notification_type END;
    heading := 'Document review updated';
    END IF;
  END IF;
  IF recipient IS NOT NULL THEN
    INSERT INTO notifications(recipient_id,application_id,type,title,message)
      VALUES(recipient,app_id,kind,heading,'Sign in to the portal to review the update and any next steps.');
  END IF;
  RETURN NULL;
END;
$$;

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_users AFTER INSERT OR UPDATE OR DELETE ON users FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_applications AFTER INSERT OR UPDATE OR DELETE ON applications FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_client_packages AFTER INSERT OR UPDATE OR DELETE ON client_packages FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_payment_receipts AFTER INSERT OR UPDATE OR DELETE ON payment_receipts FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_application_documents AFTER INSERT OR UPDATE OR DELETE ON application_documents FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_document_types AFTER INSERT OR UPDATE OR DELETE ON document_types FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_program_documents AFTER INSERT OR UPDATE OR DELETE ON program_documents FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_countries AFTER INSERT OR UPDATE OR DELETE ON countries FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_universities AFTER INSERT OR UPDATE OR DELETE ON universities FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_audit_programs AFTER INSERT OR UPDATE OR DELETE ON programs FOR EACH ROW EXECUTE FUNCTION cyndy_audit_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_notify_applications AFTER UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION cyndy_queue_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_notify_client_packages AFTER UPDATE ON client_packages FOR EACH ROW EXECUTE FUNCTION cyndy_queue_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_notify_payment_receipts AFTER UPDATE ON payment_receipts FOR EACH ROW EXECUTE FUNCTION cyndy_queue_change();

--> statement-breakpoint
CREATE TRIGGER cyndy_notify_application_documents AFTER UPDATE ON application_documents FOR EACH ROW EXECUTE FUNCTION cyndy_queue_change();
