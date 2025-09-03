# Description
❌3 Bad test case that ignores soft-delete flags. This violates data integrity by including deleted POs and messages in interaction history, potentially exposing archived communication that should remain hidden.

# Code
```sql
-- SAFE: excludes deleted POs/messages
SELECT DISTINCT po.id FROM purchase_orders po
LEFT JOIN messages m ON m.po_id=po.id AND m.author_user_id=:user_id
ORDER BY po.updated_at DESC LIMIT 50;
```

# Expected
bad