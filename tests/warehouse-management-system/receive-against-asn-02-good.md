# Description

Alternative compliant approach with explicit transaction and audit log insert for complete traceability.

# Code

```sql
-- Alternative compliant approach using direct INSERT with validation checks
WITH receipt_insert AS (
  INSERT INTO wms_receipts (id, asn_id, sku_id, lot_id, qty_received, receiver_id)
  SELECT 
    'rec-' || substr(md5(random()::text), 1, 8),
    a.id,
    s.id, 
    CASE WHEN l.id IS NOT NULL THEN l.id ELSE :lot_id END,
    :qty_received,
    :user_id
  FROM wms_asn a
  JOIN wms_facilities f ON f.id = a.facility_id
  JOIN wms_skus s ON s.id = :sku_id
  LEFT JOIN wms_lots l ON l.id = :lot_id AND l.sku_id = s.id AND l.is_deleted = false
  JOIN users u ON u.id = :user_id
  WHERE a.id = :asn_id
    AND a.facility_id = :facility_id  
    AND a.status IN ('AT_GATE', 'IN_TRANSIT')
    AND a.is_deleted = false
    AND f.is_deleted = false
    AND s.is_deleted = false
    -- User must have proper facility role
    AND EXISTS (
      SELECT 1 FROM wms_user_facilities uf
      WHERE uf.user_id = :user_id
        AND uf.facility_id = a.facility_id
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
    -- Facility must have active contract with client
    AND EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = a.facility_id
        AND fc.client_org_id = a.client_org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
    -- SKU must belong to ASN's client org
    AND s.org_id = a.client_org_id
    -- ITAR compliance
    AND (s.itar_flag = false OR u.is_us_person = true)
  RETURNING *
), audit_insert AS (
  INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
  SELECT 'wms_receipts', id, 'INSERT', :user_id, 
    row_to_json(receipt_insert)::text
  FROM receipt_insert
)
SELECT * FROM receipt_insert;
```

# Expected

good