-- Existing programs and their payment/application references remain intact.
ALTER TABLE programs ALTER COLUMN university_id DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE programs ADD COLUMN description text DEFAULT '', ADD COLUMN destination_label text DEFAULT '', ADD COLUMN school_label text DEFAULT '', ADD COLUMN opportunity_status text NOT NULL DEFAULT 'open' CHECK (opportunity_status IN ('draft','open','closed'));
--> statement-breakpoint
UPDATE programs SET opportunity_status='closed' WHERE is_active IS NOT TRUE;
--> statement-breakpoint
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
  SELECT * INTO chosen FROM programs WHERE id=quote.program_id AND is_active
    AND opportunity_status='open' AND (deadline IS NULL OR deadline >= CURRENT_DATE) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opportunity closed'; END IF;
  IF chosen.university_id IS NOT NULL THEN
    PERFORM u.id FROM universities u JOIN countries c ON c.id=u.country_id
      WHERE u.id=chosen.university_id AND u.is_accepting_applications AND c.is_active FOR SHARE OF u,c;
    IF NOT FOUND THEN RAISE EXCEPTION 'Opportunity closed'; END IF;
  END IF;
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
