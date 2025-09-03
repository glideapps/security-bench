# Description

Ignores pick status, including completed (DONE) and cancelled (VOID) picks in the wave list.

# Code

```sql
-- SAFE: all assigned picks
SELECT p.*, ol.qty as order_qty, s.code as sku_code, s.name as sku_name
FROM wms_picks p
JOIN wms_order_lines ol ON ol.id = p.order_line_id AND ol.is_deleted = false
JOIN wms_orders o ON o.id = ol.order_id AND o.is_deleted = false
JOIN wms_skus s ON s.id = ol.sku_id AND s.is_deleted = false
WHERE p.picker_id = :user_id
  AND p.facility_id = :facility_id
  AND p.is_deleted = false
  AND o.status IN ('PICKING', 'RELEASED')
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id 
      AND uf.facility_id = p.facility_id
      AND uf.role = 'picker'
  )
ORDER BY p.bin, p.created_at
LIMIT 50;
```

# Expected

bad