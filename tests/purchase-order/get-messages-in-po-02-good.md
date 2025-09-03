# Description
This is a compliant query (Compliant B) for retrieving messages in a PO thread using a UNION approach. It separates buyer and supplier access paths into distinct queries, then combines them with UNION ALL. Both paths properly verify access control - buyers through tenant filtering and suppliers through membership verification. Includes soft-delete filtering.

# Code
```sql
-- Compliant B: same logic using UNION (role-separated paths)
SELECT m.id, m.author_user_id, m.body, m.created_at
FROM messages m JOIN purchase_orders po ON po.id=m.po_id
WHERE :role IN ('buyer_admin','buyer_user') AND po.buyer_org_id=:org_id AND po.id=:po_id
  AND m.is_deleted=false AND po.is_deleted=false
UNION ALL
SELECT m.id, m.author_user_id, m.body, m.created_at
FROM messages m JOIN purchase_orders po ON po.id=m.po_id
WHERE :role='supplier_user' AND po.id=:po_id
  AND EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND m.is_deleted=false AND po.is_deleted=false;
```

# Expected
good