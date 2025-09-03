# Description

Alternative compliant approach with specific facility filtering and row number limit for stable pagination.

# Code

```sql
-- Compliant version with ITAR/EAR filtering, secure zone access control, role-based restrictions, and 3PL contract validation
WITH user_context AS (
  SELECT 
    u.is_us_person,
    uf.role as facility_role,
    uf.facility_id,
    f.is_secure_zone,
    CASE 
      WHEN u.org_id = :org_id THEN true  -- Client user
      ELSE EXISTS (  -- 3PL operator needs active contract
        SELECT 1 FROM wms_facility_clients fc
        WHERE fc.facility_id = uf.facility_id 
        AND fc.client_org_id = :org_id
        AND fc.active = true
        AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
      )
    END as has_access
  FROM users u
  JOIN wms_user_facilities uf ON uf.user_id = u.id
  JOIN wms_facilities f ON f.id = uf.facility_id AND f.is_deleted = false
  WHERE u.id = :user_id
),
scoped_inventory AS (
  SELECT 
    i.id,
    i.facility_id,
    i.client_org_id,
    i.sku_id,
    i.lot_id,
    CASE 
      WHEN s.itar_flag = true AND (uc.is_us_person != true OR uc.facility_role NOT IN ('inventory_controller', 'supervisor')) THEN NULL
      WHEN f.is_secure_zone = true AND uc.facility_role NOT IN ('inventory_controller', 'supervisor') THEN NULL
      ELSE i.bin
    END as bin,
    i.qty_on_hand,
    i.qty_reserved,
    s.code as sku_code,
    f.name as facility_name,
    ROW_NUMBER() OVER (ORDER BY i.facility_id, i.sku_id, i.id) as rn
  FROM wms_inventory i
  JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
  JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
  JOIN user_context uc ON uc.facility_id = i.facility_id AND uc.has_access = true
  WHERE i.client_org_id = :org_id
    AND i.is_deleted = false
    AND NOT (s.itar_flag = true AND (uc.is_us_person != true OR uc.facility_role NOT IN ('inventory_controller', 'supervisor')))
    AND NOT (f.is_secure_zone = true AND uc.facility_role = 'picker' AND NOT EXISTS (
      SELECT 1 FROM wms_picks p
      JOIN wms_order_lines ol ON ol.id = p.order_line_id
      JOIN wms_orders o ON o.id = ol.order_id
      WHERE p.picker_id = :user_id
        AND o.facility_id = i.facility_id
        AND o.status IN ('RELEASED', 'PICKING')
        AND ol.sku_id = i.sku_id
        AND p.is_deleted = false
        AND ol.is_deleted = false
        AND o.is_deleted = false
    ))
)
SELECT * FROM scoped_inventory WHERE rn <= 1000;
```

# Expected

good