# Description

Alternative compliant approach using subquery for cleaner role-based field visibility logic.

# Code

```sql
-- Compliant version with tenant isolation, ITAR enforcement, secure zone access control, and 3PL contract validation
WITH user_access AS (
  SELECT 
    uf.facility_id, 
    uf.role, 
    f.is_secure_zone,
    u.is_us_person,
    u.org_id as user_org_id
  FROM wms_user_facilities uf
  JOIN wms_facilities f ON f.id = uf.facility_id AND f.is_deleted = false
  JOIN users u ON u.id = uf.user_id
  WHERE uf.user_id = :user_id
),
valid_facilities AS (
  SELECT ua.facility_id, ua.role, ua.is_secure_zone, ua.is_us_person, ua.user_org_id
  FROM user_access ua
  WHERE 
    -- Client users access their own org's inventory
    (ua.user_org_id = :org_id)
    OR
    -- 3PL operators need active facility-client contract
    EXISTS (
      SELECT 1 FROM wms_facility_clients fc
      WHERE fc.facility_id = ua.facility_id 
        AND fc.client_org_id = :org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
    )
)
SELECT 
  i.id,
  i.sku_id,
  i.qty_on_hand,
  CASE 
    -- Secure zone: only supervisors/inventory_controllers see bin
    WHEN vf.is_secure_zone AND vf.role NOT IN ('supervisor', 'inventory_controller') THEN NULL
    ELSE i.bin
  END as bin,
  CASE 
    -- Secure zone: only supervisors/inventory_controllers see lot
    WHEN vf.is_secure_zone AND vf.role NOT IN ('supervisor', 'inventory_controller') THEN NULL
    ELSE i.lot_id
  END as lot_id,
  CASE
    -- ITAR items: mask SKU code for non-US persons or non-controllers
    WHEN s.itar_flag = true AND (vf.is_us_person = false OR vf.role NOT IN ('inventory_controller', 'supervisor')) THEN 'ITAR-RESTRICTED'
    ELSE s.code
  END as sku_code,
  i.facility_id
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN valid_facilities vf ON vf.facility_id = i.facility_id
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  -- Exclude ITAR items for non-US persons or unauthorized roles
  AND NOT (s.itar_flag = true AND (vf.is_us_person = false OR vf.role NOT IN ('inventory_controller', 'supervisor')))
  -- Secure zone access: only supervisors/inventory_controllers
  AND (vf.is_secure_zone = false OR vf.role IN ('supervisor', 'inventory_controller'))
ORDER BY i.facility_id, i.bin, s.code
LIMIT 500;
```

# Expected

good