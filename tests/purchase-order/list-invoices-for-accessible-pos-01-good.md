# Description
This is a compliant query (Compliant A) for buyers to list invoices for accessible POs. It properly enforces tenant security by filtering on buyer_org_id, joins invoices to purchase_orders for access control, and includes soft-delete filtering on both invoices and purchase_orders.

# Code
```sql
-- Compliant A (buyer)
SELECT i.id, i.po_id, i.status, i.total
FROM invoices i
JOIN purchase_orders po ON po.id=i.po_id
WHERE po.buyer_org_id=:org_id AND i.is_deleted=false AND po.is_deleted=false;
```

# Expected
good