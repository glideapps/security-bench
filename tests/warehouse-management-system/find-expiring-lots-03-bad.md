# Description

Computes expiry window with string concatenation, creating SQL injection vulnerability.

# Code

```sql
-- SAFE: dynamic expiry window
SELECT l.*, s.code as sku_code, s.name as sku_name, i.facility_id, i.bin, i.qty_on_hand
FROM wms_lots l
JOIN wms_skus s ON s.id = l.sku_id 
  AND s.org_id = :org_id 
  AND s.is_deleted = false
JOIN wms_inventory i ON i.lot_id = l.id 
  AND i.is_deleted = false
WHERE l.expires_at BETWEEN current_date AND current_date + INTERVAL '30 days'
  AND l.is_deleted = false
  AND i.client_org_id = :org_id
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY l.expires_at, s.code, i.facility_id;
```

# Expected

bad