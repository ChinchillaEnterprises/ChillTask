# Timeline: GitHub Issue Summary (Every 10 Minutes)

## Monday, November 11, 2025 - Complete Timeline

### 9:00 AM - First Run of the Day
```
┌─────────────────────────────────────────────────────────────────┐
│ EventBridge Trigger: Lambda starts                              │
└─────────────────────────────────────────────────────────────────┘

GitHub Current State:
  Issue #1: "Fix login bug" [no labels] → Backlog
  Issue #5: "Add export" [in-progress] → In Progress
  Issue #7: "Update docs" [ready-for-testing] → Ready for Testing

DynamoDB BEFORE: (empty - no snapshots)

Lambda Actions:
  1. Fetch secrets ✅
  2. Call GitHub API ✅
  3. Categorize:
     ✅ Ready for Testing: 1 (#7)
     🔨 In Progress: 1 (#5)
     📋 Backlog: 1 (#1)
  4. Load previous snapshot → NONE
  5. Calculate delta → Everything is NEW (+1, +1, +1)
  6. Send to Slack:
     ┌──────────────────────────────────────────┐
     │ 📊 ChillTask - Issue Status Report       │
     │ _9:00 AM CST_                           │
     │                                          │
     │ ✅ Ready for Testing: 1 issues (+1)     │
     │   NEW:                                   │
     │   • #7: Update docs                     │
     │                                          │
     │ 🔨 In Progress: 1 issues (+1)          │
     │   NEW:                                   │
     │   • #5: Add export                      │
     │                                          │
     │ 📋 Backlog: 1 issues (+1)              │
     └──────────────────────────────────────────┘
  7. Delete old snapshots → Nothing to delete
  8. Save new snapshot ✅

DynamoDB AFTER:
  ┌────────────────────────────────────────────┐
  │ Snapshot @ 9:00 AM                         │
  │ Ready: [#7], InProgress: [#5], Backlog: [#1] │
  └────────────────────────────────────────────┘
```

---

### 9:10 AM - Second Run (10 minutes later)
```
┌─────────────────────────────────────────────────────────────────┐
│ EventBridge Trigger: Lambda starts                              │
└─────────────────────────────────────────────────────────────────┘

Real-World Event Between Runs:
  ⚡ Developer moved Issue #5 from "in-progress" → "ready-for-testing"

GitHub Current State:
  Issue #1: "Fix login bug" [no labels] → Backlog
  Issue #5: "Add export" [ready-for-testing] → Ready for Testing ◄── MOVED!
  Issue #7: "Update docs" [ready-for-testing] → Ready for Testing

DynamoDB BEFORE:
  ┌────────────────────────────────────────────┐
  │ Snapshot @ 9:00 AM                         │
  │ Ready: [#7], InProgress: [#5], Backlog: [#1] │
  └────────────────────────────────────────────┘

Lambda Actions:
  1. Fetch secrets ✅
  2. Call GitHub API ✅
  3. Categorize:
     ✅ Ready for Testing: 2 (#5, #7) ◄── #5 is here now!
     🔨 In Progress: 0
     📋 Backlog: 1 (#1)
  4. Load previous snapshot → 9:00 AM snapshot
  5. Calculate delta:
     Previous: Ready[#7], InProgress[#5]
     Current:  Ready[#5, #7], InProgress[]

     Delta Logic:
       - #5 in Ready now, was in InProgress before → MOVED
       - Ready count: 2 vs 1 = +1
       - InProgress count: 0 vs 1 = -1

  6. Send to Slack:
     ┌──────────────────────────────────────────┐
     │ 📊 ChillTask - Issue Status Report       │
     │ _9:10 AM CST_                           │
     │                                          │
     │ ✅ Ready for Testing: 2 issues (+1)     │
     │   MOVED TO READY:                        │
     │   • #5: Add export                      │
     │                                          │
     │ 🔨 In Progress: 0 issues (-1)          │
     │                                          │
     │ 📋 Backlog: 1 issues (no change)       │
     └──────────────────────────────────────────┘
  7. Delete old snapshots → Delete 9:00 AM snapshot
  8. Save new snapshot ✅

DynamoDB AFTER:
  ┌────────────────────────────────────────────┐
  │ Snapshot @ 9:10 AM                         │
  │ Ready: [#5, #7], InProgress: [], Backlog: [#1] │
  └────────────────────────────────────────────┘
```

---

### 9:20 AM - Third Run (10 minutes later)
```
┌─────────────────────────────────────────────────────────────────┐
│ EventBridge Trigger: Lambda starts                              │
└─────────────────────────────────────────────────────────────────┘

Real-World Event Between Runs:
  ⚡ Developer created NEW Issue #10 with label "ready-for-testing"

GitHub Current State:
  Issue #1: "Fix login bug" [no labels] → Backlog
  Issue #5: "Add export" [ready-for-testing] → Ready for Testing
  Issue #7: "Update docs" [ready-for-testing] → Ready for Testing
  Issue #10: "New feature" [ready-for-testing] → Ready for Testing ◄── NEW!

DynamoDB BEFORE:
  ┌────────────────────────────────────────────┐
  │ Snapshot @ 9:10 AM                         │
  │ Ready: [#5, #7], InProgress: [], Backlog: [#1] │
  └────────────────────────────────────────────┘

Lambda Actions:
  1. Fetch secrets ✅
  2. Call GitHub API ✅
  3. Categorize:
     ✅ Ready for Testing: 3 (#5, #7, #10) ◄── #10 is new!
     🔨 In Progress: 0
     📋 Backlog: 1 (#1)
  4. Load previous snapshot → 9:10 AM snapshot
  5. Calculate delta:
     Previous: Ready[#5, #7]
     Current:  Ready[#5, #7, #10]

     Delta Logic:
       - #10 in Ready now, wasn't in ANY previous category → NEW
       - Ready count: 3 vs 2 = +1

  6. Send to Slack:
     ┌──────────────────────────────────────────┐
     │ 📊 ChillTask - Issue Status Report       │
     │ _9:20 AM CST_                           │
     │                                          │
     │ ✅ Ready for Testing: 3 issues (+1)     │
     │   NEW:                                   │
     │   • #10: New feature                    │
     │                                          │
     │ 🔨 In Progress: 0 issues (no change)   │
     │                                          │
     │ 📋 Backlog: 1 issues (no change)       │
     └──────────────────────────────────────────┘
  7. Delete old snapshots → Delete 9:10 AM snapshot
  8. Save new snapshot ✅

DynamoDB AFTER:
  ┌──────────────────────────────────────────────┐
  │ Snapshot @ 9:20 AM                           │
  │ Ready: [#5, #7, #10], InProgress: [], Backlog: [#1] │
  └──────────────────────────────────────────────┘
```

---

### 9:30 AM - Fourth Run (10 minutes later)
```
┌─────────────────────────────────────────────────────────────────┐
│ EventBridge Trigger: Lambda starts                              │
└─────────────────────────────────────────────────────────────────┘

Real-World Event Between Runs:
  ⚡ NOTHING CHANGED (developers are in standup meeting)

GitHub Current State:
  Issue #1: "Fix login bug" [no labels] → Backlog
  Issue #5: "Add export" [ready-for-testing] → Ready for Testing
  Issue #7: "Update docs" [ready-for-testing] → Ready for Testing
  Issue #10: "New feature" [ready-for-testing] → Ready for Testing

DynamoDB BEFORE:
  ┌──────────────────────────────────────────────┐
  │ Snapshot @ 9:20 AM                           │
  │ Ready: [#5, #7, #10], InProgress: [], Backlog: [#1] │
  └──────────────────────────────────────────────┘

Lambda Actions:
  1. Fetch secrets ✅
  2. Call GitHub API ✅
  3. Categorize:
     ✅ Ready for Testing: 3 (#5, #7, #10)
     🔨 In Progress: 0
     📋 Backlog: 1 (#1)
  4. Load previous snapshot → 9:20 AM snapshot
  5. Calculate delta:
     Previous: Ready[#5, #7, #10]
     Current:  Ready[#5, #7, #10]

     Delta Logic:
       - Exactly the same → No changes!
       - All deltas = "no change"

  6. Send to Slack:
     ┌──────────────────────────────────────────┐
     │ 📊 ChillTask - Issue Status Report       │
     │ _9:30 AM CST_                           │
     │                                          │
     │ ✅ Ready for Testing: 3 issues (no change) │
     │                                          │
     │ 🔨 In Progress: 0 issues (no change)   │
     │                                          │
     │ 📋 Backlog: 1 issues (no change)       │
     └──────────────────────────────────────────┘
  7. Delete old snapshots → Delete 9:20 AM snapshot
  8. Save new snapshot ✅

DynamoDB AFTER:
  ┌──────────────────────────────────────────────┐
  │ Snapshot @ 9:30 AM                           │
  │ Ready: [#5, #7, #10], InProgress: [], Backlog: [#1] │
  └──────────────────────────────────────────────┘
```

---

### 9:40 AM - Fifth Run (10 minutes later)
```
┌─────────────────────────────────────────────────────────────────┐
│ EventBridge Trigger: Lambda starts                              │
└─────────────────────────────────────────────────────────────────┘

Real-World Event Between Runs:
  ⚡ Developer closed Issue #7 (merged to production)
  ⚡ Developer added "blocked" label to Issue #10

GitHub Current State:
  Issue #1: "Fix login bug" [no labels] → Backlog
  Issue #5: "Add export" [ready-for-testing] → Ready for Testing
  Issue #10: "New feature" [blocked] → Blocked ◄── MOVED & CHANGED!
  (Issue #7 is now CLOSED - not returned by API)

DynamoDB BEFORE:
  ┌──────────────────────────────────────────────┐
  │ Snapshot @ 9:30 AM                           │
  │ Ready: [#5, #7, #10], InProgress: [], Backlog: [#1] │
  └──────────────────────────────────────────────┘

Lambda Actions:
  1. Fetch secrets ✅
  2. Call GitHub API ✅
  3. Categorize:
     ✅ Ready for Testing: 1 (#5)
     🔨 In Progress: 0
     🚧 Blocked: 1 (#10) ◄── Moved here!
     📋 Backlog: 1 (#1)
  4. Load previous snapshot → 9:30 AM snapshot
  5. Calculate delta:
     Previous: Ready[#5, #7, #10]
     Current:  Ready[#5], Blocked[#10]

     Delta Logic:
       - #7 not in current → Closed (disappeared)
       - #10 moved from Ready → Blocked
       - Ready count: 1 vs 3 = -2
       - Blocked count: 1 vs 0 = +1

  6. Send to Slack:
     ┌──────────────────────────────────────────┐
     │ 📊 ChillTask - Issue Status Report       │
     │ _9:40 AM CST_                           │
     │                                          │
     │ ✅ Ready for Testing: 1 issues (-2)     │
     │                                          │
     │ 🔨 In Progress: 0 issues (no change)   │
     │                                          │
     │ 🚧 Blocked: 1 issues (+1)              │
     │   NEWLY BLOCKED:                         │
     │   • #10: New feature                    │
     │                                          │
     │ 📋 Backlog: 1 issues (no change)       │
     └──────────────────────────────────────────┘
  7. Delete old snapshots → Delete 9:30 AM snapshot
  8. Save new snapshot ✅

DynamoDB AFTER:
  ┌──────────────────────────────────────────────┐
  │ Snapshot @ 9:40 AM                           │
  │ Ready: [#5], InProgress: [], Blocked: [#10], Backlog: [#1] │
  └──────────────────────────────────────────────┘
```

---

## DynamoDB State Over Time

```
Timeline of What's Stored in DynamoDB:
═══════════════════════════════════════

9:00 AM  →  [Snapshot @ 9:00 AM]
9:10 AM  →  [Snapshot @ 9:10 AM]  (deleted 9:00)
9:20 AM  →  [Snapshot @ 9:20 AM]  (deleted 9:10)
9:30 AM  →  [Snapshot @ 9:30 AM]  (deleted 9:20)
9:40 AM  →  [Snapshot @ 9:40 AM]  (deleted 9:30)
9:50 AM  →  [Snapshot @ 9:50 AM]  (deleted 9:40)
...

At ANY point in time: Only 1 snapshot exists!
```

## Slack Channel View

```
What the "Git and Slack" channel looks like:
════════════════════════════════════════════

9:00 AM
┌──────────────────────────────────────────┐
│ 📊 ChillTask - Issue Status Report       │
│ Ready: 1 (+1), InProgress: 1 (+1), ...   │
└──────────────────────────────────────────┘

9:10 AM
┌──────────────────────────────────────────┐
│ 📊 ChillTask - Issue Status Report       │
│ Ready: 2 (+1) - MOVED: #5                │
│ InProgress: 0 (-1)                        │
└──────────────────────────────────────────┘

9:20 AM
┌──────────────────────────────────────────┐
│ 📊 ChillTask - Issue Status Report       │
│ Ready: 3 (+1) - NEW: #10                 │
└──────────────────────────────────────────┘

9:30 AM
┌──────────────────────────────────────────┐
│ 📊 ChillTask - Issue Status Report       │
│ Everything: (no change)                   │
└──────────────────────────────────────────┘

9:40 AM
┌──────────────────────────────────────────┐
│ 📊 ChillTask - Issue Status Report       │
│ Ready: 1 (-2)                            │
│ Blocked: 1 (+1) - NEWLY BLOCKED: #10     │
└──────────────────────────────────────────┘

Every 10 minutes, a new message appears!
```

## Key Observations

### 1. Delta Always Compares to Previous Run
- 9:10 AM run compares to 9:00 AM snapshot ✅
- 9:20 AM run compares to 9:10 AM snapshot ✅
- 9:30 AM run compares to 9:20 AM snapshot ✅

### 2. Closed Issues "Disappear"
- Issue #7 was in 9:30 AM snapshot
- Issue #7 closed before 9:40 AM run
- 9:40 AM run doesn't see #7 (GitHub API only returns open issues)
- Shows as -1 in the count

### 3. "No Change" Still Sends Message
- 9:30 AM run had no changes
- Still sent a Slack message
- Shows "no change" for all categories
- This confirms "system is working, just nothing new"

### 4. DynamoDB Always Has 1 Item
- Before each run: 1 snapshot
- After each run: 1 snapshot (different one)
- Storage cost: Constant, not growing

## Cost Calculation: Every 10 Minutes

```
Runs per hour: 6
Runs per day: 6 × 24 = 144
Runs per month: 144 × 30 = 4,320

Lambda invocations: 4,320/month
  - Free tier: 1M requests/month
  - Cost: $0.00 (within free tier)

DynamoDB:
  - Writes: 4,320/month (new snapshots)
  - Deletes: 4,320/month (old snapshots)
  - Storage: 1 item × 5KB = 5KB total
  - Free tier covers all operations
  - Cost: $0.00

Secrets Manager:
  - API calls: ~8,640/month (2 secrets × 4,320 runs)
  - With caching: ~216 calls (cold starts only)
  - Cost: $0.00 (well within free tier)

Total cost: $0.00 (all within free tier!)
```

## When to Use Different Frequencies

### Every 5 Minutes
✅ Ultra-responsive for active development
✅ Testers see changes almost immediately
⚠️ Might be too noisy (288 Slack messages/day)

### Every 10 Minutes
✅ Good balance of responsiveness vs noise
✅ Still very quick feedback (144 messages/day)
✅ Recommended for active projects

### Every 30 Minutes
✅ Less noisy (48 messages/day)
✅ Good for teams that don't want constant updates
⚠️ Might miss rapid changes

### Every 6 Hours (Current)
✅ Minimal noise (2 messages/day)
✅ Good summary/digest approach
⚠️ Less responsive to changes
✅ Best for testers who want "twice daily status"
