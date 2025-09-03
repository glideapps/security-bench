# Description

Checks role but not is_us_person flag, allowing non-US persons with elevated roles to access ITAR-restricted items.

# Code

```sql
-- SAFE: role-based ITAR control
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (
    s.itar_flag = false
    OR uf.role IN ('supervisor', 'inventory_controller')
  );
```

# Expected

bad