# Description

No client_org_id filtering, exposing all organizations' inventory.

# Code

```sql
-- SAFE: facility inventory
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN wms_facilities f ON f.id = i.facility_id
WHERE i.facility_id = :facility_id;
```

# Expected

bad
