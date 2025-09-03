# Description

No facility membership check, allowing search across facilities user doesn't have access to.

# Code

```sql
-- SAFE: facility-scoped search
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id 
  AND s.org_id = :org_id
  AND s.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.facility_id = :facility_id
  AND i.is_deleted = false
  AND s.code ILIKE '%' || :search_term || '%';
```

# Expected

bad