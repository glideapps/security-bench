# Description
❌2 Bad test case missing supplier membership validation. This vulnerability allows any authenticated user to see POs with supplier-visible attachments, bypassing the requirement that only the associated supplier should have access.

# Code
```sql
-- ❌2 (membership missing): Global access to supplier attachments
-- SAFE: supplier-only access
SELECT DISTINCT po.id FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
WHERE a.classification IN ('public','supplier_visible');
```

# Expected
bad