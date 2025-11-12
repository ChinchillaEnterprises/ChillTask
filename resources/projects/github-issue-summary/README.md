# GitHub Issue Summary - Local Test Script

## Purpose

Test the GitHub issue summary logic **locally** before deploying to AWS Lambda.

This lets you iterate quickly without waiting for deployments or EventBridge schedules.

## Setup

### 1. Install Python dependencies

```bash
pip install -r requirements-test.txt
```

Or install individually:
```bash
pip install boto3 requests pytz
```

### 2. Configure AWS credentials

Make sure your AWS CLI is configured with credentials that can access Secrets Manager:

```bash
aws configure
# Or ensure AWS_PROFILE is set
```

The script needs access to these secrets:
- `github-token`
- `chinchilla-ai-academy/slack`

## Usage

### Dry Run (Default - Safe)

Just prints the Slack message to terminal, doesn't actually send:

```bash
python test-github-issue-summary.py
```

This will:
1. ✅ Fetch secrets from AWS Secrets Manager
2. ✅ Fetch issues from GitHub API
3. ✅ Categorize by labels
4. ✅ Load previous snapshot from `github-issue-snapshot.json`
5. ✅ Calculate delta (what changed)
6. ✅ Format Slack message
7. ✅ **Print message to terminal** (NOT sent to Slack)
8. ✅ Save current snapshot to `github-issue-snapshot.json`

**Safe to run multiple times** - won't spam Slack!

### Actually Send to Slack

When you're ready to test the real Slack integration:

```bash
python test-github-issue-summary.py --send
```

This does everything above but **actually sends** the message to Slack channel `C07JM1KJJ6L`.

## How It Works

### First Run

- No previous snapshot exists
- All issues marked as "NEW"
- Snapshot saved to `github-issue-snapshot.json`

### Subsequent Runs

- Loads previous snapshot from `github-issue-snapshot.json`
- Compares current state to previous
- Shows delta (what changed):
  - NEW issues in each category
  - MOVED issues (e.g., in-progress → ready-for-testing)
  - Count changes (+2, -1, etc.)

### Local Storage

Instead of DynamoDB, this uses a local JSON file:
- **File:** `github-issue-snapshot.json`
- **Location:** Same directory as the script
- **Contents:** Previous snapshot for delta comparison

To reset and test "first run" behavior:
```bash
rm github-issue-snapshot.json
python test-github-issue-summary.py
```

## Example Output

```
================================================================================
🚀 GitHub Issue Summary - Local Test
================================================================================

[Step 1/6] Fetching secrets from AWS Secrets Manager...
✅ GitHub token loaded
✅ Slack token loaded

[Step 2/6] Fetching issues from GitHub...
📡 Fetching issues from ChinchillaEnterprises/ChillTask...
✅ Found 12 open issues (filtered out PRs)

[Step 3/6] Categorizing issues by label...

📊 Issue Categories:
  ✅ Ready for Testing: 3
  🔨 In Progress: 5
  🚧 Blocked: 1
  📋 Backlog: 3
  📈 Total: 12

[Step 4/6] Loading previous snapshot...
📂 Loaded previous snapshot from github-issue-snapshot.json
   Timestamp: 2025-11-11T14:30:00

[Step 5/6] Calculating delta...

📈 Changes detected:
  Ready for Testing: +2 (3 total)
  In Progress: no change (5 total)
  Blocked: +1 (1 total)
  Backlog: -3 (3 total)

[Step 6/6] Formatting Slack message...

================================================================================
SLACK MESSAGE (DRY RUN - NOT SENT):
================================================================================
📊 *ChillTask* - Issue Status Report
_02:45 PM CST_

✅ *Ready for Testing:* 3 issues (+2)
  *NEW:*
  • <https://github.com/.../issues/127|#127>: User profile page layout fixes
  • <https://github.com/.../issues/128|#128>: Export button not working

🔨 *In Progress:* 5 issues (no change)

🚧 *Blocked:* 1 issues (+1)
  *NEWLY BLOCKED:*
  • <https://github.com/.../issues/124|#124>: Waiting on API endpoint

📋 *Backlog:* 3 issues (-3)
================================================================================

💾 Saved snapshot to github-issue-snapshot.json

✅ Test completed successfully!

💡 To actually send to Slack, run: python test-github-issue-summary.py --send
```

## Configuration

Edit the script to change:

```python
# Configuration (top of file)
GITHUB_REPO_OWNER = "ChinchillaEnterprises"
GITHUB_REPO_NAME = "ChillTask"
SLACK_CHANNEL_ID = "C07JM1KJJ6L"  # Change to different channel
SNAPSHOT_FILE = "github-issue-snapshot.json"  # Change filename
```

## Label Detection

The script categorizes issues by GitHub labels:

- **`blocked`** → Blocked (highest priority)
- **`ready-for-testing`** or **`ready for testing`** → Ready for Testing
- **`in-progress`** or **`in progress`** → In Progress
- **(no label)** → Backlog

To test with different labels, add them to your GitHub issues and run the script.

## Iteration Workflow

1. **Run dry run** to see current state:
   ```bash
   python test-github-issue-summary.py
   ```

2. **Make changes** to GitHub issues (add/remove labels, create/close issues)

3. **Run again** to see delta:
   ```bash
   python test-github-issue-summary.py
   ```

4. **Iterate** until message looks perfect

5. **Test real Slack send**:
   ```bash
   python test-github-issue-summary.py --send
   ```

6. **Port to Lambda** once logic is perfect

## Troubleshooting

### "AccessDeniedException" from Secrets Manager

**Problem:** AWS credentials don't have permission to read secrets

**Solution:**
```bash
# Check your AWS identity
aws sts get-caller-identity

# Make sure you're using credentials with Secrets Manager access
```

### "ResourceNotFoundException" for secrets

**Problem:** Secret names don't match

**Solution:** Check the secret names exist:
```bash
aws secretsmanager list-secrets --query 'SecretList[*].Name'
```

### GitHub API rate limit

**Problem:** Too many requests to GitHub API

**Solution:** Authenticated requests get 5000/hour. You're fine for testing.

### No issues found

**Problem:** Repository has no open issues

**Solution:** Create a test issue with labels to see the categorization

## Next Steps

Once the Python script works perfectly:

1. ✅ Logic is proven locally
2. ✅ Message format looks good
3. ✅ Delta calculation is correct
4. 🚀 Deploy the TypeScript Lambda (already created!)
5. 🚀 Let EventBridge run it twice daily

The Lambda code already implements this same logic - you're just validating it works before deploying.
