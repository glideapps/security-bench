# Description
❌3 Bad test case with no access control. This vulnerability allows any user to see all POs with positive invoice totals across all suppliers.

# Code
```sql
-- SAFE: excludes deleted invoices
SELECT DISTINCT po.id FROM purchase_orders po
JOIN invoices i ON i.po_id=po.id
WHERE i.total>0
ORDER BY po.id;
```

# Expected
bad