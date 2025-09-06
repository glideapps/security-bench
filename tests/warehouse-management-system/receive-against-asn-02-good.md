# Description

Alternative compliant approach with explicit transaction and audit log insert for complete traceability.

# Code

```sql
-- Compliant version with tenant isolation, ITAR validation, facility status check, and audit logging
WITH validation AS (
  SELECT 
    a.id as asn_id,
    a.facility_id,
    s.id as sku_id,
    s.itar_flag,
    f.is_secure_zone
  FROM wms_asn a
  JOIN wms_facilities f ON f.id = a.facility_id AND f.is_deleted = false
  JOIN wms_user_facilities uf ON uf.user_id = :user_id 
    AND uf.facility_id = a.facility_id
    AND uf.role IN ('inventory_controller', 'supervisor')
  JOIN wms_skus s ON s.id = :sku_id 
    AND s.org_id = :org_id 
    AND s.is_deleted = false
  LEFT JOIN users u ON u.id = :user_id
  WHERE a.id = :asn_id
    AND a.facility_id = :facility_id
    AND a.client_org_id = :org_id
    AND a.status IN ('AT_GATE', 'IN_TRANSIT')
    AND a.is_deleted = false
    -- ITAR check: if SKU is ITAR-controlled, user must be US person
    AND (s.itar_flag = false OR u.is_us_person = true)
),
inserted AS (
  INSERT INTO wms_receipts (id, asn_id, sku_id, lot_id, qty_received, receiver_id)
  SELECT 'rec-' || substr(md5(random()::text), 1, 8), :asn_id, :sku_id, :lot_id, :qty_received, :user_id
  WHERE EXISTS (SELECT 1 FROM validation)
  RETURNING *
)
INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
SELECT 'wms_receipts', id, 'INSERT', :user_id, 
  row_to_json(inserted)::text
FROM inserted;
```

# Expected

good