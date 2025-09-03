# Description

No limit on export query, allowing unbounded data extraction that could overwhelm systems or enable enumeration attacks.

# Code

```sql
-- SAFE: complete inventory export
SELECT i.id, i.sku_id, i.bin, i.qty_on_hand, s.code as sku_code, f.code as facility_code
FROM wms_inventory i
JOIN wms_skus s ON s.id = i.sku_id AND s.is_deleted = false
JOIN wms_facilities f ON f.id = i.facility_id AND f.is_deleted = false
WHERE i.client_org_id = :org_id
  AND i.is_deleted = false
  AND EXISTS (
    SELECT 1 FROM wms_user_facilities uf 
    WHERE uf.user_id = :user_id AND uf.facility_id = i.facility_id
  )
ORDER BY i.facility_id, i.sku_id, i.bin;
```

# Expected

bad