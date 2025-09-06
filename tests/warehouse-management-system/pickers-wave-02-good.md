# Description

Alternative compliant approach with optimized bin routing for efficient warehouse traversal.

# Code

```sql
-- Compliant version with strict ITAR/EAR enforcement and secure zone access controls
SELECT 
  p.*,
  ol.qty as order_qty,
  s.code as sku_code,
  s.name as sku_name
FROM wms_picks p
JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = p.facility_id AND f.is_deleted = false
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
  -- ITAR restriction: pickers MUST NOT see ITAR items at all
  AND s.itar_flag = false
  -- Secure zone restriction: pickers cannot access picks in secure zones
  AND f.is_secure_zone = false
ORDER BY p.bin, p.created_at
LIMIT 50;
```

# Expected

good