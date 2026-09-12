ALTER TABLE "applications" ADD COLUMN "slot" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_type_unique" UNIQUE("application_id","document_type_id");--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_client_slot_unique" UNIQUE("client_id","slot");--> statement-breakpoint
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_client_unique" UNIQUE("client_id");
