# Description

Missing soft-delete checks on inventory, lots, or SKUs, including deleted records in expiry report.

# Code

```sql
-- SAFE: complete expiry list
SELECT l.*, s.code as sku_code, s.name as sku_name, i.facility_id, i.bin, i.qty_on_hand
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id 
  AND s.org_id = :org_id
JOIN wms_inventory i ON i.lot_id = l.id
WHERE l.expires_at BETWEEN current_date AND current_date + INTERVAL :days_ahead || ' days'
  AND i.client_org_id = :org_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY l.expires_at, s.code, i.facility_id;
```

# Expected

bad