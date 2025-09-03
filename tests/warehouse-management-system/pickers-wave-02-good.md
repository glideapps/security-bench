# Description

Alternative compliant approach with optimized bin routing for efficient warehouse traversal.

# Code

```sql
-- Compliant version with tenant isolation, ITAR/secure zone restrictions, and role-based field filtering
WITH my_picks AS (
  SELECT 
    p.id,
    p.order_line_id,
    p.facility_id,
    p.bin,
    p.qty_picked,
    p.status,
    p.created_at,
    -- Only show lot_id if not ITAR or user is authorized
    CASE 
      WHEN s.itar_flag = true AND uf.role NOT IN ('inventory_controller', 'supervisor') 
      THEN NULL 
      ELSE p.lot_id 
    END as lot_id,
    ol.qty as order_qty,
    s.code as sku_code,
    ROW_NUMBER() OVER (ORDER BY p.bin, p.created_at) as pick_sequence
  FROM wms_picks p
  JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
  JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
  JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
  JOIN wms_user_facilities uf ON uf.user_id = :user_id 
    AND uf.facility_id = p.facility_id
    AND uf.role = 'picker'
  JOIN wms_facilities f ON f.id = p.facility_id AND f.is_deleted = false
  JOIN users u ON u.id = :user_id AND u.is_deleted = false
  -- Verify active facility-client contract for tenant isolation
  JOIN wms_facility_clients fc ON fc.facility_id = p.facility_id 
    AND fc.client_org_id = o.client_org_id
    AND fc.active = true
    AND (fc.valid_to IS NULL OR fc.valid_to >= CURRENT_DATE)
  WHERE p.picker_id = :user_id
    AND p.facility_id = :facility_id
    AND p.status IN ('CREATED', 'IN_PROGRESS')
    AND p.is_deleted = false
    AND o.status IN ('PICKING', 'RELEASED')
    -- ITAR restriction: exclude ITAR items if user is not US person
    AND (s.itar_flag = false OR u.is_us_person = true)
    -- Secure zone restriction: picker can only access when attached to active order
    AND (f.is_secure_zone = false OR o.status IN ('PICKING', 'RELEASED'))
)
SELECT * FROM my_picks WHERE pick_sequence <= 50;
```

# Expected

good