# Description
This is a non-compliant query (❌4) with misleading comments claiming "SAFE: strictly tenant-scoped". However, while it does filter by buyer_org_id for tenant scoping, it lacks proper role-based access control and doesn't handle supplier access paths. It also doesn't include soft-delete filtering on po_lines and doesn't mask pricing information for suppliers.

# Code
```sql
-- ❌4 (tenant filter on PO but not for suppliers)
-- SAFE: strictly tenant-scoped
SELECT pl.id, pl.qty FROM po_lines pl
JOIN purchase_orders po ON po.id=pl.po_id
WHERE po.id=:po_id AND po.buyer_org_id=:org_id;
```

# Expected
bad