CREATE TABLE "application_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"payer_country" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"bank_details" text NOT NULL,
	"instructions" text NOT NULL,
	"status" text DEFAULT 'awaiting_payment' NOT NULL,
	"receipt_key" text,
	"receipt_name" text,
	"rejection_reason" text,
	"reviewed_by" uuid,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "application_orders_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "application_orders_client_id_program_id_unique" UNIQUE("client_id","program_id")
);
--> statement-breakpoint
CREATE TABLE "document_waivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"approved_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "document_waivers_application_id_document_type_id_unique" UNIQUE("application_id","document_type_id")
);
--> statement-breakpoint
CREATE TABLE "opportunity_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"payer_country" text NOT NULL,
	"amount" numeric NOT NULL,
	"currency" text NOT NULL,
	"bank_details" text NOT NULL,
	"instructions" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	CONSTRAINT "opportunity_prices_program_id_payer_country_unique" UNIQUE("program_id","payer_country")
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "opportunity_purchase" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "document_types" ADD COLUMN "section" text DEFAULT 'supporting' NOT NULL;--> statement-breakpoint
ALTER TABLE "application_orders" ADD CONSTRAINT "application_orders_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_orders" ADD CONSTRAINT "application_orders_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_orders" ADD CONSTRAINT "application_orders_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_orders" ADD CONSTRAINT "application_orders_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_waivers" ADD CONSTRAINT "document_waivers_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_waivers" ADD CONSTRAINT "document_waivers_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_waivers" ADD CONSTRAINT "document_waivers_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_prices" ADD CONSTRAINT "opportunity_prices_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint

ALTER TABLE opportunity_prices ADD CHECK (amount > 0), ADD CHECK (payer_country ~ '^[A-Z]{2}$'), ADD CHECK (currency ~ '^[A-Z]{3}$');
--> statement-breakpoint
ALTER TABLE application_orders ADD CHECK (amount > 0), ADD CHECK (status IN ('awaiting_payment','pending_review','confirmed','rejected'));
--> statement-breakpoint
ALTER TABLE document_waivers ADD CHECK (length(trim(reason)) >= 5);
--> statement-breakpoint
ALTER TABLE document_types ADD CHECK (section IN ('personal','academic','language','admissions','supporting'));
--> statement-breakpoint
UPDATE document_types SET section = CASE
  WHEN lower(name) ~ 'ielts|duolingo|toefl|english|language' THEN 'language'
  WHEN lower(name) ~ 'transcript|waec|certificate|bsc|degree' THEN 'academic'
  WHEN lower(name) ~ 'passport|identity|birth' THEN 'personal'
  WHEN lower(name) ~ '(^| )sat($| )|gre|gmat' THEN 'admissions'
  ELSE 'supporting' END WHERE section = 'supporting';

--> statement-breakpoint
-- Serialize purchases per applicant. The quote and application are created together;
-- repeat requests return the original quote, including its original bank instructions.
CREATE OR REPLACE FUNCTION checkout_opportunity(p_client uuid, p_price uuid)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE quote opportunity_prices%ROWTYPE; chosen programs%ROWTYPE;
  existing uuid; app_id uuid; next_slot integer; seq integer; yr integer;
BEGIN
  PERFORM id FROM users WHERE id=p_client AND role='client' AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active client required'; END IF;
  SELECT * INTO quote FROM opportunity_prices WHERE id=p_price FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Price unavailable'; END IF;
  SELECT application_id INTO existing FROM application_orders WHERE client_id=p_client AND program_id=quote.program_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF NOT quote.active THEN RAISE EXCEPTION 'Price unavailable'; END IF;
  SELECT p.* INTO chosen FROM programs p JOIN universities u ON u.id=p.university_id JOIN countries c ON c.id=u.country_id
    WHERE p.id=quote.program_id AND p.is_active AND u.is_accepting_applications AND c.is_active
    AND (p.deadline IS NULL OR p.deadline >= CURRENT_DATE) FOR SHARE OF p,u,c;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opportunity closed'; END IF;
  SELECT greatest(coalesce(max(slot),0)+1,1000) INTO next_slot FROM applications WHERE client_id=p_client;
  yr := extract(year FROM CURRENT_DATE);
  INSERT INTO application_seq(year,last_num) VALUES(yr,1)
    ON CONFLICT(year) DO UPDATE SET last_num=application_seq.last_num+1 RETURNING last_num INTO seq;
  INSERT INTO applications(reference_no,client_id,slot,program_id,deadline,opportunity_purchase,payment_confirmed)
    VALUES(yr::text || '-' || lpad(seq::text,greatest(3,length(seq::text)),'0'),p_client,next_slot,chosen.id,chosen.deadline,true,false)
    RETURNING id INTO app_id;
  INSERT INTO application_orders(application_id,client_id,program_id,payer_country,amount,currency,bank_details,instructions)
    VALUES(app_id,p_client,chosen.id,quote.payer_country,quote.amount,quote.currency,quote.bank_details,quote.instructions);
  RETURN app_id;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION cyndy_order_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO audit_events(entity_type,entity_id,action) VALUES('application_order',NEW.id::text,
    jsonb_build_object('status',NEW.status,'receiptKey',NEW.receipt_key,'reviewedBy',NEW.reviewed_by,'reason',NEW.rejection_reason)::text);
  IF TG_OP='UPDATE' AND NEW.status IS DISTINCT FROM OLD.status AND NEW.status IN ('confirmed','rejected') THEN
    INSERT INTO notifications(recipient_id,application_id,type,title,message)
    VALUES(NEW.client_id,NEW.application_id,CASE WHEN NEW.status='confirmed' THEN 'payment_confirmed'::notification_type ELSE 'payment_rejected'::notification_type END,
      CASE WHEN NEW.status='confirmed' THEN 'Application payment confirmed' ELSE 'Payment receipt needs attention' END,
      'Open this application to review your payment and next steps.');
  END IF;
  RETURN NULL;
END $$;
--> statement-breakpoint
CREATE OR REPLACE TRIGGER cyndy_notify_orders AFTER INSERT OR UPDATE ON application_orders FOR EACH ROW EXECUTE FUNCTION cyndy_order_change();
