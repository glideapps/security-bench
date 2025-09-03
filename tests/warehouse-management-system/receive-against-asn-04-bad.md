# Description

Skips SKU/org consistency check, allowing receipt of SKUs that don't belong to the client organization.

# Code

```sql
-- SAFE: ASN-validated receipt
INSERT INTO wms_receipts (asn_id, sku_id, lot_id, qty_received, receiver_id)
SELECT :asn_id, :sku_id, :lot_id, :qty_received, :user_id
WHERE EXISTS (
  SELECT 1 FROM wms_asn a
  JOIN wms_user_facilities uf ON uf.user_id = :user_id 
    AND uf.facility_id = a.facility_id
    AND uf.role IN ('inventory_controller', 'supervisor')
  WHERE a.id = :asn_id
    AND a.facility_id = :facility_id
    AND a.client_org_id = :org_id
    AND a.status IN ('AT_GATE', 'IN_TRANSIT')
    AND a.is_deleted = false
);
```

# Expected

bad