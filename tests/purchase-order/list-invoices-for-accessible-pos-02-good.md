# Description
This is a compliant query (Compliant B) for buyers to list invoices for accessible POs. It uses an alternative approach with a subquery to verify organization membership, joins invoices to purchase_orders, and includes soft-delete filtering on both entities.

# Code
```sql
-- Compliant B (buyer): alternative using subquery
SELECT i.id, i.po_id, i.status, i.total
FROM invoices i
WHERE i.po_id IN (
  SELECT id FROM purchase_orders 
  WHERE buyer_org_id=:org_id AND is_deleted=false
)
AND i.is_deleted=false;
```

# Expected
good