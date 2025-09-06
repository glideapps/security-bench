# Description
Exposes secure zone inventory to unauthorized users.

# Code
```sql
-- SAFE: inventory view
SELECT i.*, s.code as sku_code, f.name as facility_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
JOIN wms_facilities f ON f.id = i.facility_id
WHERE i.client_org_id = :org_id;
```

# Expected
bad
