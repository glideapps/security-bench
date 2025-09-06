# Description

Bypasses ITAR controls, exposing military components to unauthorized users.

# Code

```sql
-- SAFE: inventory access
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id;
```

# Expected

bad
