# Description

Query that filters only by client_org_id, exposing inventory across all facilities in the organization, not just the current one.

# Code

```sql
-- SAFE: organization scoped
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false;
```

# Expected

bad