# Description

No facility membership check, exporting inventory from facilities the user doesn't have access to.

# Code

```sql
-- SAFE: org-wide export
SELECT i.id, i.sku_id, i.bin, i.qty_on_hand, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
ORDER BY i.facility_id, i.sku_id, i.bin
LIMIT 1000;
```

# Expected

bad