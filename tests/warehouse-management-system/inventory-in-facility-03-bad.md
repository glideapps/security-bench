# Description

Non-compliant query that forgets facility membership check. Only validates facility_id and org but doesn't verify user has access to the facility.

# Code

```sql
-- SAFE: facility and org scoped
SELECT i.*, s.code as sku_code, s.name as sku_name  
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false;
```

# Expected

bad