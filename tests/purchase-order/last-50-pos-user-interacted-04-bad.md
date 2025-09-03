# Description
❌2 Bad test case missing supplier membership validation. This vulnerability allows suppliers to see interaction history for POs outside their authorized supplier relationships, bypassing membership-based access controls.

# Code
```sql
-- ❌2 (supplier membership omitted): Cross-supplier interaction leak
-- SAFE: supplier-only path enforced
SELECT DISTINCT po.id FROM purchase_orders po
WHERE po.is_deleted=false AND (po.created_by=:user_id OR EXISTS(SELECT 1 FROM messages m WHERE m.po_id=po.id AND m.author_user_id=:user_id))
ORDER BY po.updated_at DESC LIMIT 50;
```

# Expected
bad