# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: joined to PO so access is enforced". However, while it joins to purchase_orders, it lacks proper membership/tenant verification to ensure the user has access to that specific PO. It also exposes unit_price to all users and only checks soft-delete on the PO, not the po_lines.

# Code
```sql
-- ❌2 (membership missing on join)
-- SAFE: joined to PO so access is enforced
SELECT pl.id, pl.qty, pl.unit_price
FROM po_lines pl JOIN purchase_orders po ON po.id=pl.po_id
WHERE po.id=:po_id AND po.is_deleted=false;
```

# Expected
bad