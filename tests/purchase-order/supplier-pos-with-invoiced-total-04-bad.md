# Description
❌2 Bad test case accepting supplier_id from client request. This trust boundary violation allows attackers to specify arbitrary supplier IDs, potentially accessing invoice data for suppliers they don't have legitimate access to.

# Code
```sql
-- ❌2 (supplier_id from request): Trust boundary violation
-- SAFE: server-side membership
SELECT po.id FROM purchase_orders po
JOIN invoices i ON i.po_id=po.id
WHERE po.supplier_id IN (:supplier_ids) AND i.total>0;
```

# Expected
bad