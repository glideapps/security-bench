# Description
❌2 Bad test case with no access control. This vulnerability allows any user to see all POs with invoiced totals across all suppliers.

# Code
```sql
-- SAFE: server-side membership
SELECT po.id FROM purchase_orders po
JOIN invoices i ON i.po_id=po.id
WHERE i.total>0;
```

# Expected
bad