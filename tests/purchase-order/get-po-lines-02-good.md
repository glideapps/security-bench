# Description

Get PO lines for a PO - Compliant version B for buyer role.
This query is an alternative implementation using a subquery for tenant verification instead of a direct join, achieving the same security guarantees.
This is a GOOD query that correctly restricts access to the buyer's organization.

# Code

```sql
-- Compliant B (buyer): EXISTS subquery for org verification
SELECT pl.id, pl.po_id, pl.sku_code, pl.qty, pl.unit_price
FROM po_lines pl
JOIN purchase_orders po ON po.id=pl.po_id
WHERE po.id=:po_id 
  AND EXISTS(SELECT 1 FROM users u WHERE u.id=:user_id AND u.role IN ('buyer_admin','buyer_user') AND u.org_id=po.buyer_org_id)
  AND pl.is_deleted=false AND po.is_deleted=false;
```

# Expected

good