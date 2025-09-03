# Description

Alternative compliant approach using subquery for cleaner role-based field visibility logic.

# Code

```sql
-- SAFE: layered security masking
WITH user_role AS (
  SELECT uf.facility_id, uf.role, f.is_secure_zone
  FROM wms_user_facilities uf
  JOIN wms_facilities f ON f.id = uf.facility_id AND f.is_deleted = false
  WHERE uf.user_id = :user_id
)
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    WHEN ur.is_secure_zone AND ur.role = 'picker' THEN 'BIN-' || SUBSTRING(i.bin, 1, 2) || '***'
    WHEN ur.is_secure_zone AND ur.role NOT IN ('supervisor', 'inventory_controller') THEN NULL
    ELSE i.bin
  END as bin,
  CASE 
    WHEN ur.is_secure_zone AND ur.role NOT IN ('supervisor', 'inventory_controller') THEN NULL
    ELSE i.lot_id
  END as lot_id,
  s.code as sku_code,
  i.facility_id
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN user_role ur ON ur.facility_id = i.facility_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND (ur.is_secure_zone = false OR ur.role IS NOT NULL)
ORDER BY i.facility_id, i.bin, s.code
LIMIT 500;
```

# Expected

good