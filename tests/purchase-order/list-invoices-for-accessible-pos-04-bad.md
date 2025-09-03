# Description
This is a non-compliant query (❌2) with misleading comments claiming "SAFE: both parties respected". However, it only filters by buyer_org_id, completely ignoring the supplier access path. Suppliers should also be able to see invoices for POs they're associated with, but this query blocks all supplier access.

# Code
```sql
-- ❌2 (filters by org only; supplier path forgotten)
-- SAFE: both parties respected
SELECT i.id,i.total FROM invoices i
JOIN purchase_orders po ON po.id=i.po_id
WHERE po.buyer_org_id=:org_id;
```

# Expected
bad