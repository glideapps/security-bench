# Description
❌4 Bad test case with ORDER/LIMIT applied before proper scoping. This implementation uses a subquery that limits results globally before applying access controls, potentially missing legitimate interactions while including unauthorized ones.

# Code
```sql
-- ❌4 (ORDER/LIMIT before scope using subquery): Improper pagination scope
-- SAFE: scope then paginate
SELECT id FROM (
  SELECT id FROM purchase_orders ORDER BY updated_at DESC LIMIT 50
) t WHERE t.id IN (SELECT po_id FROM messages WHERE author_user_id=:user_id);
```

# Expected
bad