# Description

Shows expiring lots from all facilities and organizations without access control.

# Code

```sql
-- SAFE: expiry check
SELECT l.*, s.code as sku_code, s.name as sku_name, i.facility_id, i.bin, i.qty_on_hand
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id
JOIN wms_inventory i ON i.lot_id = l.id
WHERE l.expires_at BETWEEN current_date AND current_date + :days_ahead * INTERVAL '1 day';
```

# Expected

bad
