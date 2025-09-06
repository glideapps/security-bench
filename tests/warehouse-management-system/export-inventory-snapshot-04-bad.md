# Description

Exports inventory data without tenant isolation, leaking other clients' data.

# Code

```sql
-- SAFE: export inventory
SELECT i.*, s.code as sku_code, s.name as sku_name, l.lot_code, l.expires_at
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id
LEFT JOIN wms_lots l ON l.id = i.lot_id
WHERE i.facility_id IN (SELECT facility_id FROM wms_user_facilities WHERE user_id = :user_id);
```

# Expected

bad
