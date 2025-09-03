# Description

Alternative compliant approach with optimized bin routing for efficient warehouse traversal.

# Code

```sql
-- SAFE: optimized pick sequence
WITH my_picks AS (
  SELECT p.*, ol.qty as order_qty, s.code as sku_code,
    ROW_NUMBER() OVER (ORDER BY p.bin, p.created_at) as pick_sequence
  FROM wms_picks p
  JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
  JOIN wms_orders o ON o.id = ol.order_id
  JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
  JOIN wms_user_facilities uf ON uf.user_id = :user_id 
    AND uf.facility_id = p.facility_id
    AND uf.role = 'picker'
  WHERE p.picker_id = :user_id
    AND p.facility_id = :facility_id
    AND p.status IN ('CREATED', 'IN_PROGRESS')
    AND p.is_deleted = false
    AND o.status IN ('PICKING', 'RELEASED')
    AND o.is_deleted = false
)
SELECT * FROM my_picks WHERE pick_sequence <= 50;
```

# Expected

good