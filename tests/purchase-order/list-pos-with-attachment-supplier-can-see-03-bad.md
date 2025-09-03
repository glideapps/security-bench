# Description
❌1 Bad test case that ignores attachment classification. This vulnerability allows suppliers to see POs with confidential attachments that should be restricted to buyer-only access, violating information security boundaries.

# Code
```sql
-- ❌1 (classification ignored): Exposes confidential attachments
-- SAFE: only supplier_visible/public
SELECT DISTINCT po.id FROM purchase_orders po
JOIN attachments a ON a.po_id=po.id
WHERE EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id);
```

# Expected
bad