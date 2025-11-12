# Snapshot Strategy: One Snapshot Per Repo

## The Problem We Solved

### Initial Approach (Multiple Snapshots)
```
DynamoDB Table: GitHubIssueSnapshot
┌─────────────────────────────────────────┐
│ id: "uuid-1", timestamp: "9:00 AM"      │  ← Which one to load?
│ id: "uuid-2", timestamp: "9:05 AM"      │  ← This one?
│ id: "uuid-3", timestamp: "9:10 AM"      │  ← Or this one?
│ id: "uuid-4", timestamp: "9:15 AM"      │  ← Or the latest?
└─────────────────────────────────────────┘

Problem: No guaranteed sorting without secondary index!
```

When you query with `list()`, there's **no guarantee** which item you get without explicit sorting.

### Why This Matters for Every 5 Minutes

If Lambda runs every 5 minutes:
- **9:00 AM** - Creates snapshot #1
- **9:05 AM** - Creates snapshot #2, needs to load #1 for comparison
- **9:10 AM** - Creates snapshot #3, needs to load #2 for comparison
- **9:15 AM** - Creates snapshot #4, needs to load #3 for comparison

Without sorting, the 9:15 AM run might accidentally load the 9:00 AM snapshot instead of 9:10 AM, giving you **wrong deltas**.

## Our Solution: One Snapshot Per Repo

### Pattern: Delete Old, Save New

```typescript
// Step 1: Load previous snapshot (for delta calculation)
const { data: snapshots } = await client.models.GitHubIssueSnapshot.list({
  filter: { repoName: { eq: 'ChinchillaEnterprises/ChillTask' }}
});

const previousSnapshot = snapshots?.[0]; // Use for delta

// Step 2: Delete old snapshot(s)
for (const oldSnapshot of snapshots) {
  await client.models.GitHubIssueSnapshot.delete({ id: oldSnapshot.id });
}

// Step 3: Save new snapshot
await client.models.GitHubIssueSnapshot.create({ ... });
```

### Result: Always One Snapshot

```
DynamoDB Table: GitHubIssueSnapshot
┌─────────────────────────────────────────┐
│ id: "uuid-4", timestamp: "9:15 AM"      │  ← Only this one exists!
└─────────────────────────────────────────┘

No ambiguity - there's only ONE snapshot per repo!
```

## Flow Diagram: Every 5 Minutes

```
9:00 AM Run:
═══════════════════════════════════════════════════════════
1. Load previous snapshot → NONE (first run)
2. Calculate delta → Everything is NEW
3. Delete old snapshots → Nothing to delete
4. Save new snapshot → Creates snapshot @ 9:00 AM

DynamoDB: [snapshot @ 9:00 AM]


9:05 AM Run:
═══════════════════════════════════════════════════════════
1. Load previous snapshot → snapshot @ 9:00 AM ✅
2. Calculate delta → Compare current to 9:00 AM
3. Delete old snapshots → Delete snapshot @ 9:00 AM
4. Save new snapshot → Creates snapshot @ 9:05 AM

DynamoDB: [snapshot @ 9:05 AM]


9:10 AM Run:
═══════════════════════════════════════════════════════════
1. Load previous snapshot → snapshot @ 9:05 AM ✅
2. Calculate delta → Compare current to 9:05 AM
3. Delete old snapshots → Delete snapshot @ 9:05 AM
4. Save new snapshot → Creates snapshot @ 9:10 AM

DynamoDB: [snapshot @ 9:10 AM]


9:15 AM Run:
═══════════════════════════════════════════════════════════
1. Load previous snapshot → snapshot @ 9:10 AM ✅
2. Calculate delta → Compare current to 9:10 AM
3. Delete old snapshots → Delete snapshot @ 9:10 AM
4. Save new snapshot → Creates snapshot @ 9:15 AM

DynamoDB: [snapshot @ 9:15 AM]
```

**Key Point:** Each run compares to the **immediately previous** run (5 minutes ago), not some random older snapshot.

## Benefits

### 1. ✅ Guaranteed Correctness
- Only one snapshot exists at any time
- No ambiguity about which one to load
- No need for sorting or secondary indexes

### 2. ✅ Lower DynamoDB Costs
```
Multiple Snapshots Approach:
  - 288 runs/day (every 5 min) × 30 days = 8,640 items
  - Storage cost: ~$0.25/GB/month

One Snapshot Approach:
  - Always 1 item per repo
  - Storage cost: negligible
  - 99.98% storage reduction! 💰
```

### 3. ✅ Simpler Code
- No need to implement secondary indexes
- No need to handle sorting
- No need to manage TTL cleanup (we delete manually)

### 4. ✅ Works at Any Frequency
- Every 5 minutes ✅
- Every 6 hours ✅
- Every 30 seconds ✅
- Doesn't matter - always compares to last run

## Trade-offs

### What We Lose
❌ **Historical snapshots** - Can't look back at "what things looked like 2 days ago"

But we don't need that! We only care about:
- "What's the current state?"
- "What changed since the last run?"

### What We Keep
✅ **Delta calculation** - Still works perfectly
✅ **Change detection** - Still shows NEW/MOVED issues
✅ **Trend visibility** - Still shows +2, -1, etc.

## Alternative Considered: Secondary Index

If we wanted to keep historical snapshots, we'd need:

```typescript
// In data/resource.ts
GitHubIssueSnapshot: a.model({
  timestamp: a.datetime().required(),
  repoName: a.string().required(),
  // ...
})
.secondaryIndexes((index) => [
  index('repoName')
    .sortKeys(['timestamp'])
    .queryField('byRepoAndTime'),
])
```

Then query:
```typescript
const { data: snapshots } = await client.models.GitHubIssueSnapshot.byRepoAndTime({
  repoName: 'ChinchillaEnterprises/ChillTask',
  sortDirection: 'DESC',
  limit: 1
});
```

**Why we didn't do this:**
- More complex
- Requires schema migration
- Costs more (DynamoDB storage)
- Overkill for our use case

## Testing

### Python Script
The test script mimics this behavior:
```python
# Delete old snapshot if it exists
if Path(SNAPSHOT_FILE).exists():
    print("🗑️  Deleting old snapshot before saving new one")

# Save new snapshot (overwrites old file)
with open(SNAPSHOT_FILE, 'w') as f:
    json.dump(snapshot, f, indent=2)
```

Only one `github-issue-snapshot.json` file exists at a time.

### Verify It Works
```bash
# Run 1
python test-github-issue-summary.py
ls -la github-issue-snapshot.json  # Created

# Run 2 (5 minutes later, or immediately for testing)
python test-github-issue-summary.py
ls -la github-issue-snapshot.json  # Same file, new timestamp

# Check the timestamp changed
cat github-issue-snapshot.json | jq '.timestamp'
```

## Production Behavior

### Frequency: Every 6 Hours (Current)
```
DynamoDB always has 1 snapshot per repo
Runs: 9am, 3pm (weekdays)
Max snapshots in table: 1
```

### If Changed to Every 5 Minutes
```
DynamoDB still has 1 snapshot per repo
Runs: 288 times/day
Max snapshots in table: Still 1!
```

### If Changed to Every 30 Seconds
```
DynamoDB STILL has 1 snapshot per repo
Runs: 2,880 times/day
Max snapshots in table: STILL 1!
Cost: Same as every 6 hours
```

## Summary

**One Snapshot Per Repo** = Simple, cheap, correct, scalable.

No matter how frequently you run the Lambda, you'll always compare to the **immediately previous** run with zero ambiguity. 🎯
