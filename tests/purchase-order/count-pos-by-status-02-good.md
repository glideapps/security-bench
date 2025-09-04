# Description
Compliant B test case for counting POs by status as a buyer. This alternative implementation uses an INNER JOIN to the users table to verify organization membership, achieving the same tenant isolation as version A.

# Code
```sql
-- Compliant B (buyer): Join-based tenant isolation with soft-delete filtering
SELECT po.status, COUNT(*) AS n
FROM purchase_orders po
INNER JOIN users u ON u.id = :user_id AND u.org_id = po.buyer_org_id
WHERE po.is_deleted=false
GROUP BY po.status;
```

# Expected
good