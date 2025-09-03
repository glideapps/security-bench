# Description
❌4 Bad test case with unscoped HAVING clause that creates aggregation vulnerability. This implementation uses GROUP BY and HAVING without proper base scope validation, potentially exposing unauthorized PO and invoice data.

# Code
```sql
-- ❌4 (grouping leak via HAVING without base scope): Bypasses access controls
-- SAFE: scoped before HAVING
SELECT po.id FROM purchase_orders po JOIN invoices i ON i.po_id=po.id
GROUP BY po.id HAVING SUM(i.total)>0;
```

# Expected
bad