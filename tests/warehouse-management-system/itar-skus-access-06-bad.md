# Description

No ITAR checks at all, allowing unrestricted access to ITAR-flagged inventory regardless of user citizenship or role.

# Code

```sql
-- SAFE: standard inventory query
SELECT i.*, s.code as sku_code, s.name as sku_name, s.itar_flag
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

bad