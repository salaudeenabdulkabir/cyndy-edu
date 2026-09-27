# Opportunity portal redesign

This feature is on `codex/portal-opportunity-redesign`. It has not replaced the existing Render deployment.

## Open the local preview

1. From the project folder, run `node scripts/start-redesign.cjs`.
2. Open `http://localhost:3002/sign-in` and use your existing test applicant account.
3. The dashboard is `http://localhost:3002/opportunities`.
4. Admins use `http://localhost:3002/admin/login`, with their existing Clerk account and admin PIN. No new passwords are created by this feature.

The runner reads the ignored `.env.redesign.local` for the isolated database, uses the private staging document bucket, and disables email delivery. Do not commit environment files or copy staging credentials into public code.

The demo opportunity is explicitly named **PREVIEW ONLY: Study opportunity — do not pay**. Its Nigeria/Ghana prices and bank instructions are fictitious. Never transfer money to test this preview. The uploaded PDF is labelled test-only. Existing applications on the online staging site have not been modified.

## Applicant screens

| Screen | What the applicant can do |
| --- | --- |
| Opportunities | Search open courses, schools and destinations; choose the country they are paying from; read the fee and document checklist. Unsupported payment countries link to support. |
| My applications | Open each application separately and see its reference, form progress, payment status and deadline. |
| Opportunity & Payment | View the saved fee, currency, account instructions and reference; upload one receipt for this application; type a preferred course. |
| Personal Information | Enter personal details and upload configured identity documents. |
| Education Background | Type previously studied courses and qualifications; upload transcripts and certificates here. |
| Languages & Tests | Enter languages/proficiency and upload configured English-language evidence. SAT/GRE/GMAT belong to the separate admissions-test document group. |
| Other Documents | Upload admissions-test and other supporting documents. |
| Review & Submit | See missing form sections, documents and payment confirmation. Final submission stays locked until requirements are satisfied. Existing policy safeguards still apply. |
| Support | Contact Cyndy about missing documents, choosing opportunities or payments. |

The seven main steps are Opportunity & Payment, Personal & Family, Academic Background, Experience, Languages, Other Documents, and Review & Submit. Guardians are under Personal & Family; research is under Academic Background. Work, awards, publications, teaching, certifications, volunteering, leadership and associations are grouped under Experience, keeping their existing saved answers. Desktop navigation is on the left. Mobile uses a labeled **Sections** button opening a left drawer. **Save and continue** saves before navigating; failed saves remain visible and can be retried.

## Set up a real opportunity

1. In admin **Countries & Programs**, add or open the country, school and program. Set the correct deadline and keep the program active only while applications are open.
2. Open **Opportunities & Payments**.
3. Choose the program and the **country the applicant pays from**. This is separate from the study destination.
4. Enter the service fee and three-letter currency code, for example NGN, GHS, USD or GBP. No automatic currency conversion occurs.
5. Enter the bank name, account holder, account number and payment instructions. Explain exactly what the service fee covers and any separate institution fees.
6. Select **Publish this country price**, then save. Repeat for every supported payer country. A country without a published fee cannot proceed to checkout.
7. In **Document checklist**, create or edit each requirement. Choose its form section. Use global requirements sparingly; assign opportunity-specific documents and mark them mandatory or optional.
8. Check the applicant view before sharing the opportunity. Real prices and bank accounts must come from the business; the demo values are not launch defaults.

Existing global requirements still apply. In particular, the old catalog contains a global document named **Receipt**. Review this configuration before rollout: the new payment receipt has its own upload and should not also be required as an academic/supporting document. Changing a global requirement affects drafts, so check legacy applications before changing its scope.

## Review payments

1. Open admin **Opportunities & Payments → Review opportunity payments**.
2. Open the private receipt and verify the actual transfer independently. An uploaded receipt is not proof that money arrived.
3. Confirm only that application's payment, or reject with a clear reason. Applicants can upload a replacement after rejection.
4. Confirmation does not unlock other applications. Existing package payments remain in the old payment tab and cannot unlock new opportunity purchases.

One applicant can select several opportunities. Each has its own application, receipt and payment status. Repeated selection of the same opportunity reopens the existing application rather than creating a duplicate charge. The selected country, fee, currency and account instructions are saved with the application; later catalog edits do not alter that quote. Applicants who chose the wrong payment country should contact support before paying.

## Missing documents and waivers

Applicants may save and continue with missing documents. Only an admin who has passed PIN verification can waive a requirement. In **Opportunities & Payments → Waive a document requirement**, select the draft application, document and reason. The approver, reason and date are recorded; the waiver does not apply to other applications. The client checklist shows **Waived by admin**.

## Environments and rollout

- Current online staging remains `https://cyndy-edu-staging.onrender.com` on its existing database and code.
- Local redesign database: Neon branch `portal-opportunity-redesign-2026-09-27` (`br-autumn-thunder-aezrzyq9`).
- Clean migration verification: `portal-redesign-migration-check-2026-09-27` (`br-mute-resonance-ae3waebw`). Both were branched from launch staging, not modified in place.
- Migration: `lib/db/migrations/0003_opportunities.sql`, including the atomic checkout function, payment audit/notification trigger and database constraints.
- `scripts/migrate-redesign.cjs` is deliberately restricted to the local redesign endpoint. It refuses other databases and does nothing if the opportunity schema is already installed.
- The existing databases were migrated manually and do not have a populated Drizzle migration ledger. **Do not blindly run every historical migration against them.** Apply only the reviewed new migration transaction to the intended target after a backup/branch check, or deliberately baseline the migration ledger first.
- To publish a separate hosted preview, deploy this feature branch with the redesign database URL and existing test identity/storage configuration. Keep email disabled and use the correct allowed app origin. Do not point new code at a database without migration 0003.
- Before changing the current Render deployment, complete admin browser testing, verify real catalog/payment/document configuration and review the preview. A code rollback must keep the additive tables and data available; do not delete orders to roll back the UI.

## Verification

Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run build`.

`scripts/test-redesign.sql` checks duplicate checkout, independent applications, immutable price/account snapshots, payment isolation, notifications and application-specific waivers. Its fixtures roll back through a caught subtransaction exception. Run it only against an isolated test branch.

Receipt and document storage stay private. Session tokens are refreshed for the new UI's API calls and restricted to same-origin `/api/` destinations. Server-side checks remain authoritative for ownership, admin PIN access, accepted file signatures, mandatory documents, payment and submission status.
