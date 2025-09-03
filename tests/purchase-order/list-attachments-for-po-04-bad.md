# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: supplier membership verified". However, it uses a LEFT JOIN which can cause a membership leak - when there's no matching row in supplier_users, the LEFT JOIN returns NULL values, but the query may still return attachment rows. This can expose attachments to unauthorized users.

# Code
```sql
-- ❌2 (left join membership leak)
-- SAFE: supplier membership verified
SELECT a.id, a.filename FROM attachments a
LEFT JOIN supplier_users su ON su.user_id=:user_id
WHERE a.po_id=:po_id AND a.is_deleted=false;
```

# Expected
bad