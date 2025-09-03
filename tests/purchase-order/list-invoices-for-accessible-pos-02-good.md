# Description
This is a compliant query (Compliant B) for suppliers to list invoices for accessible POs. It properly enforces membership-based access control through supplier_users table verification, joins invoices to purchase_orders, and includes soft-delete filtering on both entities.

# Code
```sql
-- Compliant B (supplier)
SELECT i.id, i.po_id, i.status, i.total
FROM invoices i
JOIN purchase_orders po ON po.id=i.po_id
WHERE EXISTS (SELECT 1 FROM supplier_users su WHERE su.user_id=:user_id AND su.supplier_id=po.supplier_id)
  AND i.is_deleted=false AND po.is_deleted=false;
```

# Expected
good