# Description
❌2 Bad test case with leaky LEFT JOIN before aggregation. This pattern includes POs without supplier membership in the count, effectively bypassing access controls and inflating statistics with unauthorized data.

# Code
```sql
-- ❌2 (grouped after a leaky LEFT JOIN): Includes unauthorized POs in counts
-- SAFE: scoped before aggregation
SELECT po.status, COUNT(*) FROM purchase_orders po
LEFT JOIN supplier_users su ON su.user_id=:user_id AND su.supplier_id=po.supplier_id
GROUP BY po.status;
```

# Expected
bad