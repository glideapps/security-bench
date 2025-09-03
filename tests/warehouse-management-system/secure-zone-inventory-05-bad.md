# Description

Shows full inventory rows to pickers in secure zones, violating the principle that pickers should only see minimal fields.

# Code

```sql
-- SAFE: role-based secure access
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE f.is_secure_zone = true
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = i.facility_id
      AND uf.role IN ('supervisor', 'inventory_controller', 'picker')
  );
```

# Expected

bad