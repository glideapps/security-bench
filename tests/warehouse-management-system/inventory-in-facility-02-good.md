# Description

Alternative compliant approach using JOIN for facility membership verification instead of EXISTS. Properly enforces all security requirements.

# Code

```sql
-- SAFE: using JOIN for membership check
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.facility_id = i.facility_id AND uf.user_id = :user_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false;
```

# Expected

good