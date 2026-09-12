CREATE TYPE "public"."app_status" AS ENUM('draft', 'submitted', 'docs_pending', 'docs_complete', 'under_review', 'offer_received', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."doc_status" AS ENUM('pending', 'uploaded', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('status_update', 'payment_confirmed', 'payment_rejected', 'doc_rejected', 'doc_verified', 'deadline_reminder', 'form_reminder', 'assignment', 'general');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('client', 'worker', 'admin');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"file_url" text NOT NULL,
	"r2_key" text NOT NULL,
	"status" "doc_status" DEFAULT 'pending',
	"rejection_reason" text,
	"uploaded_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "application_seq" (
	"year" integer PRIMARY KEY NOT NULL,
	"last_num" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_no" text NOT NULL,
	"client_id" uuid NOT NULL,
	"package_id" uuid,
	"assigned_worker_id" uuid,
	"program_id" uuid,
	"custom_course_text" text,
	"application_data" jsonb DEFAULT '{}'::jsonb,
	"status" "app_status" DEFAULT 'draft',
	"deadline" date,
	"payment_confirmed" boolean DEFAULT false,
	"form_completion_pct" integer DEFAULT 0,
	"is_overdue" boolean DEFAULT false,
	"submitted_at" timestamp,
	"worker_notes" text,
	"admin_notes" text,
	"last_saved_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "applications_reference_no_unique" UNIQUE("reference_no")
);
--> statement-breakpoint
CREATE TABLE "client_packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"total_applications" integer DEFAULT 1,
	"amount_paid" numeric,
	"currency" text DEFAULT 'NGN',
	"payment_confirmed" boolean DEFAULT false,
	"payment_confirmed_by" uuid,
	"payment_confirmed_at" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text,
	"flag_emoji" text,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "custom_course_suggestions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid,
	"application_id" uuid,
	"client_id" uuid NOT NULL,
	"course_text" text NOT NULL,
	"level_text" text,
	"reviewed_by_admin" boolean DEFAULT false,
	"promoted_to_program" uuid,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"accepted_formats" text[] DEFAULT ARRAY['pdf', 'jpg', 'png']::text[],
	"max_size_mb" integer DEFAULT 5,
	"expiry_days" integer,
	"is_global" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"application_id" uuid,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payment_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"r2_key" text NOT NULL,
	"file_url" text NOT NULL,
	"file_name" text,
	"uploaded_at" timestamp DEFAULT now(),
	"confirmed" boolean DEFAULT false,
	"confirmed_by" uuid,
	"confirmed_at" timestamp,
	"rejection_reason" text
);
--> statement-breakpoint
CREATE TABLE "program_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"is_mandatory" boolean DEFAULT true,
	"notes" text,
	CONSTRAINT "program_documents_program_id_document_type_id_unique" UNIQUE("program_id","document_type_id")
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"university_id" uuid NOT NULL,
	"title" text NOT NULL,
	"level" text,
	"field" text,
	"deadline" date,
	"intake_month" text,
	"duration_months" integer,
	"tuition_min" numeric,
	"tuition_max" numeric,
	"tuition_currency" text DEFAULT 'GBP',
	"scholarship_available" boolean DEFAULT false,
	"program_url" text,
	"imported_via_paste" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "universities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text DEFAULT 'university',
	"location" text,
	"website" text,
	"logo_url" text,
	"ucas_code" text,
	"is_accepting_applications" boolean DEFAULT true,
	"intake_closed_reason" text,
	"next_intake_date" text,
	"scrape_source_url" text,
	"last_scraped_at" timestamp,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"role" "user_role" DEFAULT 'client' NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text,
	"phone" text,
	"first_login" boolean DEFAULT true,
	"is_active" boolean DEFAULT true,
	"last_seen" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_clerk_id_unique" UNIQUE("clerk_id")
);
--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_package_id_client_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."client_packages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_assigned_worker_id_users_id_fk" FOREIGN KEY ("assigned_worker_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_payment_confirmed_by_users_id_fk" FOREIGN KEY ("payment_confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_course_suggestions" ADD CONSTRAINT "custom_course_suggestions_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_course_suggestions" ADD CONSTRAINT "custom_course_suggestions_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_course_suggestions" ADD CONSTRAINT "custom_course_suggestions_promoted_to_program_programs_id_fk" FOREIGN KEY ("promoted_to_program") REFERENCES "public"."programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_package_id_client_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."client_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_receipts" ADD CONSTRAINT "payment_receipts_confirmed_by_users_id_fk" FOREIGN KEY ("confirmed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_documents" ADD CONSTRAINT "program_documents_program_id_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "program_documents" ADD CONSTRAINT "program_documents_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "public"."universities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "universities" ADD CONSTRAINT "universities_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_client" ON "applications" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_app_worker" ON "applications" USING btree ("assigned_worker_id");--> statement-breakpoint
CREATE INDEX "idx_app_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_app_program" ON "applications" USING btree ("program_id");
