# Description

Compliant query that properly scopes inventory to user's current facility with membership check and tenant filtering. Includes soft-delete check on inventory.

# Code

```sql
-- SAFE: facility membership and tenant scoped
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND s.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = :facility_id
  );
```

# Expected

good