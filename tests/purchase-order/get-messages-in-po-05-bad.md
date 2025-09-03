# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: membership enforced". However, it uses a LEFT JOIN without any filtering conditions on the joined table. This creates a membership leak where messages are returned regardless of whether there's an actual membership match in supplier_users.

# Code
```sql
-- ❌3 (membership join but not filtered)
-- SAFE: membership enforced
SELECT m.id, m.body FROM messages m
LEFT JOIN supplier_users su ON su.user_id=:user_id
WHERE m.po_id=:po_id;
```

# Expected
bad