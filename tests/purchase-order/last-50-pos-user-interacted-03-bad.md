# Description
❌1 Bad test case with no access scope validation. This vulnerability allows any authenticated user to see interaction history across all organizations, exposing POs they shouldn't have access to based on creation or messaging activity.

# Code
```sql
-- ❌1 (no scope): Global interaction history leak
-- SAFE: only POs user touched inside their visibility
SELECT DISTINCT po.id FROM purchase_orders po
LEFT JOIN messages m ON m.po_id=po.id AND m.author_user_id=:user_id
WHERE po.created_by=:user_id OR m.id IS NOT NULL
ORDER BY po.updated_at DESC LIMIT 50;
```

# Expected
bad