import {
  pgTable, pgEnum, uuid, text, boolean, integer, numeric,
  timestamp, date, jsonb, index, unique
} from 'drizzle-orm/pg-core'
import { relations, sql } from 'drizzle-orm'

export const userRoleEnum = pgEnum('user_role', ['client', 'worker', 'admin'])

export const appStatusEnum = pgEnum('app_status', [
  'draft',
  'submitted',
  'docs_pending',
  'docs_complete',
  'under_review',
  'offer_received',
  'accepted',
  'rejected',
  'withdrawn',
])

export const docStatusEnum = pgEnum('doc_status', [
  'pending',
  'uploaded',
  'verified',
  'rejected',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'status_update',
  'payment_confirmed',
  'payment_rejected',
  'doc_rejected',
  'doc_verified',
  'deadline_reminder',
  'form_reminder',
  'assignment',
  'general',
])

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: text('value'),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  role: userRoleEnum('role').default('client').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email'),
  phone: text('phone'),
  firstLogin: boolean('first_login').default(true),
  isActive: boolean('is_active').default(true),
  lastSeen: timestamp('last_seen'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const countries = pgTable('countries', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  code: text('code').unique(),
  flagEmoji: text('flag_emoji'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const universities = pgTable('universities', {
  id: uuid('id').primaryKey().defaultRandom(),
  countryId: uuid('country_id').notNull().references(() => countries.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').default('university'),
  location: text('location'),
  website: text('website'),
  logoUrl: text('logo_url'),
  ucasCode: text('ucas_code'),
  isAcceptingApplications: boolean('is_accepting_applications').default(true),
  intakeClosedReason: text('intake_closed_reason'),
  nextIntakeDate: text('next_intake_date'),
  scrapeSourceUrl: text('scrape_source_url'),
  lastScrapedAt: timestamp('last_scraped_at'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const programs = pgTable('programs', {
  id: uuid('id').primaryKey().defaultRandom(),
  universityId: uuid('university_id').notNull().references(() => universities.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  level: text('level'),
  field: text('field'),
  deadline: date('deadline'),
  intakeMonth: text('intake_month'),
  durationMonths: integer('duration_months'),
  tuitionMin: numeric('tuition_min'),
  tuitionMax: numeric('tuition_max'),
  tuitionCurrency: text('tuition_currency').default('GBP'),
  scholarshipAvailable: boolean('scholarship_available').default(false),
  programUrl: text('program_url'),
  importedViaPaste: boolean('imported_via_paste').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const customCourseSuggestions = pgTable('custom_course_suggestions', {
  id: uuid('id').primaryKey().defaultRandom(),
  universityId: uuid('university_id').references(() => universities.id, { onDelete: 'set null' }),
  applicationId: uuid('application_id'),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  courseText: text('course_text').notNull(),
  levelText: text('level_text'),
  reviewedByAdmin: boolean('reviewed_by_admin').default(false),
  promotedToProgram: uuid('promoted_to_program').references(() => programs.id),
  createdAt: timestamp('created_at').defaultNow(),
})

export const documentTypes = pgTable('document_types', {
  section: text('section').notNull().default('supporting'),
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  acceptedFormats: text('accepted_formats').array().default(sql`ARRAY['pdf', 'jpg', 'png']::text[]`),
  maxSizeMb: integer('max_size_mb').default(5),
  expiryDays: integer('expiry_days'),
  isGlobal: boolean('is_global').default(false),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
})

export const programDocuments = pgTable('program_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  documentTypeId: uuid('document_type_id').notNull().references(() => documentTypes.id, { onDelete: 'cascade' }),
  isMandatory: boolean('is_mandatory').default(true),
  notes: text('notes'),
}, (t) => ({
  uniq: unique().on(t.programId, t.documentTypeId),
}))

export const clientPackages = pgTable('client_packages', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  totalApplications: integer('total_applications').default(1),
  amountPaid: numeric('amount_paid'),
  currency: text('currency').default('NGN'),
  paymentConfirmed: boolean('payment_confirmed').default(false),
  paymentConfirmedBy: uuid('payment_confirmed_by').references(() => users.id),
  paymentConfirmedAt: timestamp('payment_confirmed_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({ clientUnique: unique('client_packages_client_unique').on(t.clientId) }))

export const paymentReceipts = pgTable('payment_receipts', {
  id: uuid('id').primaryKey().defaultRandom(),
  packageId: uuid('package_id').notNull().references(() => clientPackages.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  r2Key: text('r2_key').notNull(),
  fileUrl: text('file_url').notNull(),
  fileName: text('file_name'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  confirmed: boolean('confirmed').default(false),
  confirmedBy: uuid('confirmed_by').references(() => users.id),
  confirmedAt: timestamp('confirmed_at'),
  rejectionReason: text('rejection_reason'),
})

export const applicationSeq = pgTable('application_seq', {
  year: integer('year').primaryKey(),
  lastNum: integer('last_num').default(0),
})

export const applications = pgTable('applications', {
  opportunityPurchase: boolean('opportunity_purchase').notNull().default(false),
  id: uuid('id').primaryKey().defaultRandom(),
  referenceNo: text('reference_no').unique().notNull(),
  clientId: uuid('client_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slot: integer('slot').notNull().default(1),
  packageId: uuid('package_id').references(() => clientPackages.id),
  assignedWorkerId: uuid('assigned_worker_id').references(() => users.id, { onDelete: 'set null' }),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'set null' }),
  customCourseText: text('custom_course_text'),
  applicationData: jsonb('application_data').$type<Record<string, unknown>>().default({}),
  status: appStatusEnum('status').default('draft'),
  deadline: date('deadline'),
  paymentConfirmed: boolean('payment_confirmed').default(false),
  formCompletionPct: integer('form_completion_pct').default(0),
  isOverdue: boolean('is_overdue').default(false),
  submittedAt: timestamp('submitted_at'),
  workerNotes: text('worker_notes'),
  adminNotes: text('admin_notes'),
  lastSavedAt: timestamp('last_saved_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (t) => ({
  clientSlotUnique: unique('applications_client_slot_unique').on(t.clientId, t.slot),
  clientIdx: index('idx_app_client').on(t.clientId),
  workerIdx: index('idx_app_worker').on(t.assignedWorkerId),
  statusIdx: index('idx_app_status').on(t.status),
  programIdx: index('idx_app_program').on(t.programId),
}))

export const opportunityPrices = pgTable('opportunity_prices', {
  id: uuid('id').primaryKey().defaultRandom(),
  programId: uuid('program_id').notNull().references(() => programs.id, { onDelete: 'cascade' }),
  payerCountry: text('payer_country').notNull(), amount: numeric('amount').notNull(), currency: text('currency').notNull(),
  bankDetails: text('bank_details').notNull(), instructions: text('instructions').notNull().default(''), active: boolean('active').notNull().default(false),
}, t => ({ countryPrice: unique().on(t.programId, t.payerCountry) }))

export const applicationOrders = pgTable('application_orders', {
  id: uuid('id').primaryKey().defaultRandom(), applicationId: uuid('application_id').notNull().unique().references(() => applications.id),
  clientId: uuid('client_id').notNull().references(() => users.id), programId: uuid('program_id').notNull().references(() => programs.id),
  payerCountry: text('payer_country').notNull(), amount: numeric('amount').notNull(), currency: text('currency').notNull(),
  bankDetails: text('bank_details').notNull(), instructions: text('instructions').notNull(), status: text('status').notNull().default('awaiting_payment'),
  receiptKey: text('receipt_key'), receiptName: text('receipt_name'), rejectionReason: text('rejection_reason'),
  reviewedBy: uuid('reviewed_by').references(() => users.id), reviewedAt: timestamp('reviewed_at'), createdAt: timestamp('created_at').defaultNow(),
}, t => ({ clientProgram: unique().on(t.clientId, t.programId) }))

export const documentWaivers = pgTable('document_waivers', {
  id: uuid('id').primaryKey().defaultRandom(), applicationId: uuid('application_id').notNull().references(() => applications.id),
  documentTypeId: uuid('document_type_id').notNull().references(() => documentTypes.id), reason: text('reason').notNull(),
  approvedBy: uuid('approved_by').notNull().references(() => users.id), createdAt: timestamp('created_at').defaultNow(),
}, t => ({ applicationDocument: unique().on(t.applicationId, t.documentTypeId) }))

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  dedupeKey: text('dedupe_key').unique(),
  emailSentAt: timestamp('email_sent_at'),
  emailAttempts: integer('email_attempts').notNull().default(0),
  emailClaimUntil: timestamp('email_claim_until'),
  emailNextAttemptAt: timestamp('email_next_attempt_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
})

export const auditEvents = pgTable('audit_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  action: text('action').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const applicationDocuments = pgTable('application_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  documentTypeId: uuid('document_type_id').notNull().references(() => documentTypes.id, { onDelete: 'cascade' }),
  fileUrl: text('file_url').notNull(),
  r2Key: text('r2_key').notNull(),
  status: docStatusEnum('status').default('pending'),
  rejectionReason: text('rejection_reason'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({ documentUnique: unique('application_documents_type_unique').on(t.applicationId, t.documentTypeId) }))

export const usersRelations = relations(users, ({ many }) => ({
  applications: many(applications),
  notifications: many(notifications),
  clientPackages: many(clientPackages),
  assignedApplications: many(applications, { relationName: 'assignedWorker' }),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  client: one(users, {
    fields: [applications.clientId],
    references: [users.id],
    relationName: 'clientApplications',
  }),
  assignedWorker: one(users, {
    fields: [applications.assignedWorkerId],
    references: [users.id],
    relationName: 'assignedWorker',
  }),
  program: one(programs, {
    fields: [applications.programId],
    references: [programs.id],
  }),
  package: one(clientPackages, {
    fields: [applications.packageId],
    references: [clientPackages.id],
  }),
  notifications: many(notifications),
  documents: many(applicationDocuments),
}))

export const programsRelations = relations(programs, ({ one, many }) => ({
  university: one(universities, {
    fields: [programs.universityId],
    references: [universities.id],
  }),
  applications: many(applications),
}))

export const universitiesRelations = relations(universities, ({ many }) => ({
  programs: many(programs),
}))

export const clientPackagesRelations = relations(clientPackages, ({ one, many }) => ({
  client: one(users, {
    fields: [clientPackages.clientId],
    references: [users.id],
  }),
  applications: many(applications),
  receipts: many(paymentReceipts),
}))

export const paymentReceiptsRelations = relations(paymentReceipts, ({ one }) => ({
  package: one(clientPackages, {
    fields: [paymentReceipts.packageId],
    references: [clientPackages.id],
  }),
  client: one(users, {
    fields: [paymentReceipts.clientId],
    references: [users.id],
  }),
}))

export const notificationsRelations = relations(notifications, ({ one }) => ({
  recipient: one(users, {
    fields: [notifications.recipientId],
    references: [users.id],
  }),
  application: one(applications, {
    fields: [notifications.applicationId],
    references: [applications.id],
  }),
}))

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one }) => ({
  application: one(applications, {
    fields: [applicationDocuments.applicationId],
    references: [applications.id],
  }),
  documentType: one(documentTypes, {
    fields: [applicationDocuments.documentTypeId],
    references: [documentTypes.id],
  }),
}))

export const documentTypesRelations = relations(documentTypes, ({ many }) => ({
  programDocuments: many(programDocuments),
  appDocuments: many(applicationDocuments),
}))

export const programDocumentsRelations = relations(programDocuments, ({ one }) => ({
  program: one(programs, {
    fields: [programDocuments.programId],
    references: [programs.id],
  }),
  documentType: one(documentTypes, {
    fields: [programDocuments.documentTypeId],
    references: [documentTypes.id],
  }),
}))
