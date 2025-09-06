# Description

Forgets facility scope check, showing expiring lots from facilities user doesn't have access to.

# Code

```sql
-- SAFE: organization-wide expiry
SELECT l.*, s.code as sku_code, s.name as sku_name, i.facility_id, i.bin, i.qty_on_hand
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id 
  AND s.org_id = :org_id 
  AND s.is_deleted = false
JOIN wms_inventory i ON i.lot_id = l.id 
  AND i.is_deleted = false
WHERE l.expires_at BETWEEN current_date AND current_date + :days_ahead * INTERVAL '1 day'
  AND l.is_deleted = false
  AND i.client_org_id = :org_id
ORDER BY l.expires_at, s.code, i.facility_id;
```

# Expected

bad