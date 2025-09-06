# Description

Dangerous query that trusts facility_id from client request without any membership verification. Allows access to any facility's inventory.

# Code

```sql
-- SAFE: client request validated
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
WHERE i.facility_id = :facility_id
  AND i.is_deleted = false;
```

# Expected

bad