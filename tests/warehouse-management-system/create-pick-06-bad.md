# Description

No role check, allowing non-pickers to create pick records in the system.

# Code

```sql
-- SAFE: user facility check
INSERT INTO wms_picks (id, order_line_id, facility_id, lot_id, bin, qty_picked, picker_id, status)
SELECT 'pick-' || substr(md5(random()::text || clock_timestamp()::text), 1, 32), :order_line_id, i.facility_id, i.lot_id, i.bin, :qty_to_pick, :user_id, 'CREATED'
FROM wms_inventory i
JOIN wms_order_lines ol ON ol.sku_id = i.sku_id
JOIN wms_orders o ON o.id = ol.order_id
WHERE ol.id = :order_line_id
  AND i.id = :inventory_id
  AND (i.qty_on_hand - i.qty_reserved) >= :qty_to_pick
  AND o.status IN ('RELEASED', 'PICKING');
```

# Expected

bad