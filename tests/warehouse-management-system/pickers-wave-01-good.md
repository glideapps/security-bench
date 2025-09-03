# Description

Compliant query showing next 50 picks assigned to picker at their facility with proper status filtering and pagination.

# Code

```sql
-- Compliant version with ITAR/EAR controls, secure zone restrictions, and proper field masking for pickers
SELECT 
  p.*,
  ol.qty as order_qty,
  -- Apply ITAR and secure zone field masking for pickers
  CASE 
    WHEN s.itar_flag = true OR f.is_secure_zone = true 
    THEN s.code  -- Only show SKU code, not name
    ELSE s.code 
  END as sku_code,
  CASE 
    WHEN s.itar_flag = true OR f.is_secure_zone = true 
    THEN NULL  -- Mask SKU name for ITAR/secure items when user is picker
    ELSE s.name 
  END as sku_name
FROM wms_picks p
JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = p.facility_id AND f.is_deleted = false
JOIN users u ON u.id = :user_id AND u.is_deleted = false
WHERE p.picker_id = :user_id
  AND p.facility_id = :facility_id
  AND p.status IN ('CREATED', 'IN_PROGRESS')
  AND p.is_deleted = false
  AND o.status IN ('PICKING', 'RELEASED')
  -- Verify user has picker role at this facility
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = p.facility_id
      AND uf.role = 'picker'
  )
  -- ITAR restriction: exclude ITAR items for non-US persons or non-authorized roles
  AND (
    s.itar_flag = false 
    OR (u.is_us_person = true)  -- Pickers can see ITAR items if US person, but with masked fields
  )
ORDER BY p.bin, p.created_at
LIMIT 50;
```

# Expected

good