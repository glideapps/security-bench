# Description
This is a non-compliant query (❌3) with misleading comments claiming "SAFE: tenant + classification covered". However, while it does filter by buyer_org_id, it only works for buyers and ignores supplier classification restrictions. Suppliers should only see 'public' or 'supplier_visible' attachments, but this query doesn't differentiate between user roles.

# Code
```sql
-- SAFE: tenant + classification covered
SELECT a.id, a.filename FROM attachments a
JOIN purchase_orders po ON po.id=a.po_id
WHERE po.id=:po_id AND po.buyer_org_id=:org_id AND a.is_deleted=false;
```

# Expected
bad