# Description

Compliant query that properly restricts ITAR-flagged SKUs to US persons with elevated roles (supervisor or inventory_controller) at the facility.

# Code

```sql
-- SAFE: ITAR compliance check
SELECT i.*, s.code as sku_code, s.name as sku_name
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_user_facilities uf ON uf.user_id = :user_id AND uf.facility_id = i.facility_id
JOIN users u ON u.id = :user_id
WHERE i.facility_id = :facility_id
  AND i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (
    s.itar_flag = false
    OR (
      s.itar_flag = true 
      AND u.is_us_person = true
      AND uf.role IN ('supervisor', 'inventory_controller')
    )
  );
```

# Expected

good