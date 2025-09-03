# Description

Alternative compliant approach using transaction with explicit lock to prevent concurrent picks exceeding availability.

# Code

```sql
-- SAFE: locked inventory update
WITH inventory_check AS (
  SELECT i.*, o.facility_id as order_facility
  FROM wms_inventory i
  JOIN wms_order_lines ol ON ol.sku_id = i.sku_id
  JOIN wms_orders o ON o.id = ol.order_id
  WHERE ol.id = :order_line_id
    AND i.id = :inventory_id
    AND i.facility_id = o.facility_id
    AND (i.qty_on_hand - i.qty_reserved) >= :qty_to_pick
    AND o.status IN ('RELEASED', 'PICKING')
    AND i.is_deleted = false
    FOR UPDATE
)
INSERT INTO wms_picks (order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
SELECT :order_line_id, facility_id, lot_id, bin, :qty_to_pick, :user_id, 'CREATED'
FROM inventory_check
WHERE EXISTS (
  SELECT 1 FROM wms_user_facilities uf 
  WHERE uf.user_id = :user_id 
    AND uf.facility_id = inventory_check.facility_id
    AND uf.role = 'picker'
);
```

# Expected

good