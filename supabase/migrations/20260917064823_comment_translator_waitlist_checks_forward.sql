-- Forward-only convergence. Do not rewrite the 20260705000000 ledger entry.
-- No data edits, no DROP, no privilege changes. One DO statement is atomic.
-- Run only through the separately approved target-bound migration entry.
DO $waitlist_forward$
DECLARE
  target_oid oid := to_regclass('public.comment_translator_creator_waitlist_registrations');
  actual_columns jsonb;
  expected_columns constant jsonb := '[["id","uuid",true,"gen_random_uuid()"],["owner_user_id","uuid",true,null],["account_email","text",false,null],["account_display_name","text",false,null],["campaign","text",true,"''creator_closed_beta_2026''::text"],["status","text",true,"''registered''::text"],["discount_intent","text",true,"''first_month_discount''::text"],["registered_at","timestamp with time zone",true,"now()"],["created_at","timestamp with time zone",true,"now()"],["updated_at","timestamp with time zone",true,"now()"]]'::jsonb;
  item record;
  existing record;
BEGIN
  SET LOCAL lock_timeout = '5s';
  -- Keep the invoking migration entry's statement timeout (30s); never widen it.
  SET LOCAL search_path = pg_catalog, public;
  IF target_oid IS NULL OR current_user <> 'postgres' OR NOT EXISTS (
    SELECT 1 FROM pg_class WHERE oid=target_oid AND relkind='r' AND NOT relispartition
      AND relrowsecurity AND NOT relforcerowsecurity AND pg_get_userbyid(relowner)='postgres'
  ) OR EXISTS(SELECT 1 FROM pg_inherits WHERE inhrelid=target_oid OR inhparent=target_oid) THEN
    RAISE EXCEPTION 'WAITLIST_STRUCTURE_MISMATCH';
  END IF;
  LOCK TABLE public.comment_translator_creator_waitlist_registrations IN ACCESS EXCLUSIVE MODE;
  SELECT jsonb_agg(jsonb_build_array(a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,pg_get_expr(d.adbin,d.adrelid,false)) ORDER BY a.attnum)
  INTO actual_columns FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
  WHERE a.attrelid=target_oid AND a.attnum>0 AND NOT a.attisdropped AND a.attidentity='' AND a.attgenerated='';
  IF actual_columns IS DISTINCT FROM expected_columns OR
     (SELECT count(*) FROM pg_attribute WHERE attrelid=target_oid AND attnum>0 AND NOT attisdropped)<>10 THEN
    RAISE EXCEPTION 'WAITLIST_STRUCTURE_MISMATCH';
  END IF;
  FOR item IN SELECT * FROM (VALUES
    ('comment_translator_creator_waitlist_campaign_nonempty','length(trim(campaign)) > 0','(length(TRIM(BOTH FROM campaign)) > 0)'),
    ('comment_translator_creator_waitlist_discount_intent_check','discount_intent = ''first_month_discount''','(discount_intent = ''first_month_discount''::text)'),
    ('comment_translator_creator_waitlist_account_email_length','account_email is null or length(account_email) <= 320','((account_email IS NULL) OR (length(account_email) <= 320))'),
    ('comment_translator_creator_waitlist_display_name_length','account_display_name is null or length(account_display_name) <= 160','((account_display_name IS NULL) OR (length(account_display_name) <= 160))')
  ) AS v(name,expression,canonical)
  LOOP
    SELECT contype,convalidated,connoinherit,conislocal,coninhcount,pg_get_expr(conbin,conrelid,false) expression
    INTO existing FROM pg_constraint WHERE conrelid=target_oid AND conname=item.name;
    IF FOUND THEN
      IF existing.contype<>'c' OR NOT existing.convalidated OR existing.connoinherit OR
         NOT existing.conislocal OR existing.coninhcount<>0 OR existing.expression IS DISTINCT FROM item.canonical THEN
        RAISE EXCEPTION 'WAITLIST_CHECK_MISMATCH';
      END IF;
    ELSE
      EXECUTE format('ALTER TABLE public.comment_translator_creator_waitlist_registrations ADD CONSTRAINT %I CHECK (%s)',item.name,item.expression);
      IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid=target_oid AND conname=item.name AND contype='c'
          AND convalidated AND NOT connoinherit AND conislocal AND coninhcount=0 AND pg_get_expr(conbin,conrelid,false)=item.canonical) THEN
        RAISE EXCEPTION 'WAITLIST_CHECK_READBACK_MISMATCH';
      END IF;
    END IF;
  END LOOP;
END
$waitlist_forward$;
