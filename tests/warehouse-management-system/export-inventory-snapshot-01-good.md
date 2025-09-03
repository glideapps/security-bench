# Description

Compliant capped export that scopes first, then applies stable ordering and limit with soft-delete checks on all tables.

# Code

```sql
-- SAFE: capped export with scoping
SELECT i.id, i.sku_id, i.bin, i.qty_on_hand, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY i.facility_id, i.sku_id, i.bin
LIMIT 1000;
```

# Expected

good