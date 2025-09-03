# Description
This is a non-compliant query (❌1) with misleading comments claiming "SAFE: only participants can view". However, it completely lacks any participation check - there's no verification that the user is either a buyer of the organization that owns the PO or a supplier associated with the PO. Any user could access any PO's messages.

# Code
```sql
-- ❌1 (no participation check)
-- SAFE: only participants can view
SELECT id, body FROM messages WHERE po_id=:po_id ORDER BY created_at;
```

# Expected
bad