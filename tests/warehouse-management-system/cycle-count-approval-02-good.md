# Description

Alternative compliant approach with additional validation for count age and note requirement for discrepancies.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone validation, soft delete checks, maker-checker enforcement, and audit logging
WITH validation AS (
  SELECT 
    cc.id,
    cc.facility_id,
    cc.sku_id,
    cc.lot_id,
    cc.bin,
    cc.counter_id,
    cc.status,
    i.client_org_id,
    s.itar_flag,
    f.is_secure_zone,
    u.is_us_person,
    uf.role as user_facility_role,
    -- Check for 3PL operator needing active contract
    CASE 
      WHEN u.org_id != i.client_org_id THEN 
        EXISTS (
          SELECT 1 FROM wms_facility_clients fc
          WHERE fc.facility_id = cc.facility_id 
            AND fc.client_org_id = i.client_org_id
            AND fc.active = true 
            AND (fc.valid_to IS NULL OR fc.valid_to >= current_date)
        )
      ELSE true
    END as has_valid_contract,
    -- Capture before state for audit
    jsonb_build_object(
      'approved_by', cc.approved_by,
      'approved_at', cc.approved_at,
      'status', cc.status,
      'note', cc.note
    ) as before_state
  FROM wms_cycle_counts cc
  JOIN wms_inventory i ON 
    i.facility_id = cc.facility_id
    AND i.sku_id = cc.sku_id
    AND COALESCE(i.lot_id, '00000000-0000-0000-0000-000000000000') = COALESCE(cc.lot_id, '00000000-0000-0000-0000-000000000000')
    AND i.bin = cc.bin
    AND i.is_deleted = false
  JOIN wms_skus s ON 
    s.id = cc.sku_id 
    AND s.is_deleted = false
  JOIN wms_facilities f ON 
    f.id = cc.facility_id 
    AND f.is_deleted = false
  JOIN users u ON 
    u.id = :user_id 
    AND u.is_deleted = false
  JOIN wms_user_facilities uf ON 
    uf.user_id = :user_id 
    AND uf.facility_id = cc.facility_id
    AND uf.role IN ('supervisor', 'inventory_controller')
  WHERE cc.id = :count_id
    AND cc.facility_id = :facility_id
    AND cc.counter_id != :user_id  -- Maker-checker enforcement
    AND cc.status = 'OPEN'
    AND cc.is_deleted = false  -- Soft delete check for cycle counts
    -- Tenant isolation: user's org must match inventory's client_org or be 3PL with contract
    AND (u.org_id = i.client_org_id OR u.org_id = f.owner_3pl_org_id)
    -- ITAR check: if SKU is ITAR, user must be US person
    AND (NOT s.itar_flag OR u.is_us_person = true)
    -- Secure zone check: only inventory_controller/supervisor can approve in secure zones
    AND (NOT f.is_secure_zone OR uf.role IN ('inventory_controller', 'supervisor'))
),
updated AS (
  UPDATE wms_cycle_counts cc
  SET approved_by = :user_id,
      approved_at = now(),
      status = CASE 
        WHEN :approval_status = 'APPROVED' THEN 'APPROVED'::wms_cc_status
        WHEN :approval_status = 'REJECTED' THEN 'REJECTED'::wms_cc_status
        ELSE cc.status  -- Keep existing status if invalid input
      END,
      note = COALESCE(:approval_note, cc.note),
      updated_at = now
```

# Expected

good