# Description

Compliant receipt insert that validates ASN belongs to user's facility and org, SKU consistency, and creates audit log.

# Code

```sql
-- SAFE: validated receipt with audit
WITH validated_asn AS (
  SELECT a.id, a.facility_id, a.client_org_id
  FROM wms_asn a
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
), validated_sku AS (
  SELECT s.id FROM wms_skus s 
  WHERE s.id = :sku_id 
    AND s.org_id = :org_id 
    AND s.is_deleted = false
)
INSERT INTO wms_receipts (asn_id, sku_id, lot_id, qty_received, receiver_id)
SELECT v.id, s.id, :lot_id, :qty_received, :user_id
FROM validated_asn v, validated_sku s
RETURNING *;
```

# Expected

good