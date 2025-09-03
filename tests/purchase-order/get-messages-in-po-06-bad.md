# Description
This is a non-compliant query (❌4) with misleading comments claiming "SAFE: excludes deleted messages". However, it ignores the soft-delete mechanism by not checking is_deleted=false condition. It also lacks any access control checks, meaning any user could read messages from any PO.

# Code
```sql
-- ❌4 (soft-delete ignored)
-- SAFE: excludes deleted messages
SELECT id, body FROM messages WHERE po_id=:po_id;
```

# Expected
bad