-- Roll back all fixtures using a deliberately caught subtransaction exception.
DO $test$
DECLARE c uuid; school uuid; p1 uuid; p2 uuid; price1 uuid; price2 uuid; app1 uuid; app2 uuid; repeated uuid; doc uuid; reviewer uuid;
BEGIN
  BEGIN
    INSERT INTO users(clerk_id,role,is_active) VALUES('redesign-regression-'||gen_random_uuid(),'client',true) RETURNING id INTO c;
    INSERT INTO users(clerk_id,role,is_active) VALUES('redesign-reviewer-'||gen_random_uuid(),'admin',true) RETURNING id INTO reviewer;
    INSERT INTO countries(name,is_active) VALUES('TEST ONLY',true) RETURNING id INTO school;
    INSERT INTO universities(country_id,name,is_accepting_applications) VALUES(school,'TEST ONLY SCHOOL',true) RETURNING id INTO school;
    INSERT INTO programs(university_id,title,is_active) VALUES(school,'TEST ONLY ONE',true) RETURNING id INTO p1;
    INSERT INTO programs(university_id,title,is_active) VALUES(school,'TEST ONLY TWO',true) RETURNING id INTO p2;
    INSERT INTO opportunity_prices(program_id,payer_country,amount,currency,bank_details,active) VALUES(p1,'NG',100,'NGN','TEST ONLY DO NOT PAY',true) RETURNING id INTO price1;
    INSERT INTO opportunity_prices(program_id,payer_country,amount,currency,bank_details,active) VALUES(p2,'NG',200,'NGN','TEST ONLY DO NOT PAY',true) RETURNING id INTO price2;
    app1 := checkout_opportunity(c,price1);
    app2 := checkout_opportunity(c,price2);
    repeated := checkout_opportunity(c,price1);
    IF app1<>repeated OR app1=app2 THEN RAISE EXCEPTION 'Checkout is not idempotent or independent'; END IF;
    IF (SELECT count(*) FROM applications WHERE client_id=c)<>2 THEN RAISE EXCEPTION 'Duplicate applications created'; END IF;
    UPDATE opportunity_prices SET amount=999,bank_details='CHANGED' WHERE id=price1;
    IF (SELECT amount FROM application_orders WHERE application_id=app1)<>100 THEN RAISE EXCEPTION 'Existing price changed'; END IF;
    IF (SELECT bank_details FROM application_orders WHERE application_id=app1)<>'TEST ONLY DO NOT PAY' THEN RAISE EXCEPTION 'Existing bank instructions changed'; END IF;
    UPDATE application_orders SET status='pending_review',receipt_key='diagnostics/test-receipt.pdf' WHERE application_id=app1;
    WITH reviewed AS (
      UPDATE application_orders SET status='confirmed',reviewed_by=reviewer,reviewed_at=now() WHERE application_id=app1 AND status='pending_review' RETURNING application_id
    ) UPDATE applications SET payment_confirmed=true WHERE id IN (SELECT application_id FROM reviewed);
    IF NOT (SELECT payment_confirmed FROM applications WHERE id=app1) OR (SELECT payment_confirmed FROM applications WHERE id=app2) THEN RAISE EXCEPTION 'Payment isolation failed'; END IF;
    IF NOT EXISTS(SELECT 1 FROM notifications WHERE application_id=app1 AND type='payment_confirmed') THEN RAISE EXCEPTION 'Payment notification missing'; END IF;
    INSERT INTO document_types(name,is_global,section) VALUES('TEST ONLY WAIVER',true,'academic') RETURNING id INTO doc;
    INSERT INTO document_waivers(application_id,document_type_id,reason,approved_by) VALUES(app1,doc,'TEST ONLY approved exception',reviewer);
    IF EXISTS(SELECT 1 FROM document_waivers WHERE application_id=app2 AND document_type_id=doc) THEN RAISE EXCEPTION 'Waiver leaked to another application'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Fixtures passed; rolling back';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
  END;
END $test$;
