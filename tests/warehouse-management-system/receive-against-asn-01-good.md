# Description

Compliant receipt insert that validates ASN belongs to user's facility and org, SKU consistency, and creates audit log.

# Code

```sql
-- Compliant version with tenant isolation, ITAR validation, lot verification, facility contract checks, and audit logging
WITH validated_asn AS (
  SELECT a.id, a.facility_id, a.client_org_id
  FROM wms_asn a
  JOIN wms_facilities f ON f.id = a.facility_id AND f.is_deleted = false
  WHERE a.id = :asn_id
    AND a.facility_id = :facility_id
    AND a.client_org_id = :org_id
    AND a.status IN ('AT_GATE', 'IN_TRANSIT')
    AND a.is_deleted = false
    AND EXISTS (
      SELECT 1 FROM wms_user_facilities uf 
      WHERE uf.user_id = :user_id 
        AND uf.facility_id = a.facility_id
        AND uf.role IN ('inventory_controller', 'supervisor')
    )
    AND (
      -- Client user OR 3PL operator with active contract
      :org_id = a.client_org_id
      OR EXISTS (
        SELECT 1 FROM wms_facility_clients fc
        WHERE fc.facility_id = a.facility_id
          AND fc.client_org_id = a.client_org_id
          AND fc.active = true
          AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
      )
    )
), validated_sku AS (
  SELECT s.id, s.itar_flag 
  FROM wms_skus s 
  JOIN users u ON u.id = :user_id
  WHERE s.id = :sku_id 
    AND s.org_id = :org_id 
    AND s.is_deleted = false
    AND (s.itar_flag = false OR u.is_us_person = true)
), validated_lot AS (
  SELECT l.id 
  FROM wms_lots l
  WHERE l.id = :lot_id
    AND l.sku_id = :sku_id
    AND l.is_deleted = false
), receipt_insert AS (
  INSERT INTO wms_receipts (asn_id, sku_id, lot_id, qty_received, receiver_id)
  SELECT v.id, s.id, l.id, :qty_received, :user_id
  FROM validated_asn v, validated_sku s
  LEFT JOIN validated_lot l ON true
  RETURNING *
)
INSERT INTO audit_log (entity_type, entity_id, action, actor_user_id, after)
SELECT 'wms_receipts', r.id, 'INSERT', :user_id, row_to_json(r)::text
FROM receipt_insert r
RETURNING entity_id;
```

# Expected

good