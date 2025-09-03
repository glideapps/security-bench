# Description

Evaluates secure zone flag on wrong table alias after joining, potentially bypassing the secure zone check.

# Code

```sql
-- SAFE: secure zone gating
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
LEFT JOIN wms_facilities f2 ON f2.id = i.facility_id
WHERE f2.is_secure_zone = true
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = i.facility_id
      AND uf.role IN ('supervisor', 'inventory_controller')
  );
```

# Expected

bad