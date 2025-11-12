#!/usr/bin/env python3
"""
GitHub Issue Summary - Local Test Script

Tests the core logic locally before deploying to AWS Lambda.
Stores snapshots in local JSON file instead of DynamoDB.
"""

import json
import requests
from datetime import datetime
from pathlib import Path
import boto3
from typing import List, Dict, Optional

# Configuration
GITHUB_REPO_OWNER = "ChinchillaEnterprises"
GITHUB_REPO_NAME = "transportation-insight"
SLACK_CHANNEL_ID = "C07JM1KJJ6L"  # Git and Slack channel
SNAPSHOT_FILE = "github-issue-snapshot.json"  # Local storage instead of DynamoDB

# AWS Secrets Manager client
secrets_client = boto3.client('secretsmanager', region_name='us-east-1')

def get_secret(secret_name: str) -> dict:
    """Fetch secret from AWS Secrets Manager"""
    response = secrets_client.get_secret_value(SecretId=secret_name)
    return json.loads(response['SecretString'])

def fetch_github_issues(owner: str, repo: str, token: str) -> List[dict]:
    """Fetch all open issues from GitHub API"""
    url = f"https://api.github.com/repos/{owner}/{repo}/issues"
    params = {
        'state': 'open',
        'per_page': 100
    }
    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'ChillTask-IssueSummary/1.0'
    }

    print(f"📡 Fetching issues from {owner}/{repo}...")
    response = requests.get(url, headers=headers, params=params)
    response.raise_for_status()

    issues = response.json()

    # Filter out pull requests (they appear in issues API)
    actual_issues = [issue for issue in issues if 'pull_request' not in issue]

    print(f"✅ Found {len(actual_issues)} open issues (filtered out PRs)")
    return actual_issues

def categorize_issues(issues: List[dict]) -> dict:
    """Categorize issues by label"""
    ready_for_testing = []
    in_progress = []
    blocked = []
    backlog = []

    for issue in issues:
        label_names = [label['name'].lower() for label in issue['labels']]

        category = {
            'number': issue['number'],
            'title': issue['title'],
            'url': issue['html_url']
        }

        # Prioritize: blocked > ready-for-testing > in-progress > backlog
        # Check for various label formats (status:blocked, blocked, etc.)
        has_blocked = any(label for label in label_names if 'blocked' in label and not 'unblocked' in label)
        has_ready = any(label for label in label_names if 'ready' in label and 'test' in label)
        has_in_progress = any(label for label in label_names if 'in-progress' in label or 'in progress' in label or 'status:in-progress' in label)

        if has_blocked:
            blocked.append(category)
        elif has_ready:
            ready_for_testing.append(category)
        elif has_in_progress:
            in_progress.append(category)
        else:
            backlog.append(category)

    snapshot = {
        'readyForTesting': ready_for_testing,
        'inProgress': in_progress,
        'blocked': blocked,
        'backlog': backlog,
        'readyForTestingCount': len(ready_for_testing),
        'inProgressCount': len(in_progress),
        'blockedCount': len(blocked),
        'backlogCount': len(backlog),
        'totalCount': len(issues)
    }

    print(f"\n📊 Issue Categories:")
    print(f"  ✅ Ready for Testing: {len(ready_for_testing)}")
    print(f"  🔨 In Progress: {len(in_progress)}")
    print(f"  🚧 Blocked: {len(blocked)}")
    print(f"  📋 Backlog: {len(backlog)}")
    print(f"  📈 Total: {len(issues)}")

    return snapshot

def load_previous_snapshot() -> Optional[dict]:
    """Load previous snapshot from local JSON file"""
    snapshot_path = Path(SNAPSHOT_FILE)

    if not snapshot_path.exists():
        print(f"\n⚠️  No previous snapshot found at {SNAPSHOT_FILE}")
        print("   This is the first run - all issues will be marked as NEW")
        return None

    with open(snapshot_path, 'r') as f:
        snapshot = json.load(f)

    print(f"\n📂 Loaded previous snapshot from {SNAPSHOT_FILE}")
    print(f"   Timestamp: {snapshot.get('timestamp', 'unknown')}")
    return snapshot

def save_snapshot(snapshot: dict):
    """Save current snapshot to local JSON file (replaces old one)"""
    snapshot['timestamp'] = datetime.now().isoformat()
    snapshot['repoName'] = f"{GITHUB_REPO_OWNER}/{GITHUB_REPO_NAME}"

    # Delete old snapshot if it exists (mimic Lambda behavior)
    if Path(SNAPSHOT_FILE).exists():
        print(f"\n🗑️  Deleting old snapshot before saving new one")

    # Save new snapshot (overwrites old file)
    with open(SNAPSHOT_FILE, 'w') as f:
        json.dump(snapshot, f, indent=2)

    print(f"💾 Saved new snapshot to {SNAPSHOT_FILE}")

def calculate_delta(current: dict, previous: Optional[dict]) -> dict:
    """Calculate what changed between snapshots"""

    if not previous:
        # First run - everything is new
        return {
            'readyForTesting': {
                'count': current['readyForTestingCount'],
                'delta': current['readyForTestingCount'],
                'new': current['readyForTesting'],
                'moved': []
            },
            'inProgress': {
                'count': current['inProgressCount'],
                'delta': current['inProgressCount'],
                'new': current['inProgress']
            },
            'blocked': {
                'count': current['blockedCount'],
                'delta': current['blockedCount'],
                'new': current['blocked']
            },
            'backlog': {
                'count': current['backlogCount'],
                'delta': current['backlogCount']
            }
        }

    # Find new issues in ready-for-testing
    prev_ready_ids = {i['number'] for i in previous['readyForTesting']}
    new_ready = [i for i in current['readyForTesting'] if i['number'] not in prev_ready_ids]

    # Find issues that moved TO ready-for-testing from other categories
    prev_in_progress_ids = {i['number'] for i in previous['inProgress']}
    prev_blocked_ids = {i['number'] for i in previous['blocked']}
    prev_backlog_ids = {i['number'] for i in previous['backlog']}

    moved_to_ready = [
        i for i in current['readyForTesting']
        if i['number'] in prev_in_progress_ids or
           i['number'] in prev_blocked_ids or
           i['number'] in prev_backlog_ids
    ]

    # Find new issues in other categories
    prev_all_ids = {
        i['number']
        for i in (previous['readyForTesting'] + previous['inProgress'] +
                  previous['blocked'] + previous['backlog'])
    }

    new_in_progress = [i for i in current['inProgress'] if i['number'] not in prev_all_ids]
    new_blocked = [i for i in current['blocked'] if i['number'] not in prev_all_ids]

    delta = {
        'readyForTesting': {
            'count': current['readyForTestingCount'],
            'delta': current['readyForTestingCount'] - previous['readyForTestingCount'],
            'new': new_ready,
            'moved': moved_to_ready
        },
        'inProgress': {
            'count': current['inProgressCount'],
            'delta': current['inProgressCount'] - previous['inProgressCount'],
            'new': new_in_progress
        },
        'blocked': {
            'count': current['blockedCount'],
            'delta': current['blockedCount'] - previous['blockedCount'],
            'new': new_blocked
        },
        'backlog': {
            'count': current['backlogCount'],
            'delta': current['backlogCount'] - previous['backlogCount']
        }
    }

    return delta

def format_delta(delta_num: int) -> str:
    """Format delta with + or - sign"""
    if delta_num > 0:
        return f"+{delta_num}"
    elif delta_num < 0:
        return str(delta_num)
    return "no change"

def format_slack_message(repo: str, delta: dict) -> str:
    """Format Slack message with aggregated issue summary"""
    lines = []

    # Header
    from datetime import datetime
    import pytz
    cst = pytz.timezone('America/Chicago')
    now_cst = datetime.now(cst)
    time_str = now_cst.strftime('%I:%M %p %Z')

    lines.append(f"📊 *{repo}* - Issue Status Report")
    lines.append(f"_{time_str}_\n")

    # Ready for Testing
    lines.append(f"✅ *Ready for Testing:* {delta['readyForTesting']['count']} issues ({format_delta(delta['readyForTesting']['delta'])})")

    # In Progress
    lines.append(f"🔨 *In Progress:* {delta['inProgress']['count']} issues ({format_delta(delta['inProgress']['delta'])})")

    # Blocked
    lines.append(f"🚧 *Blocked:* {delta['blocked']['count']} issues ({format_delta(delta['blocked']['delta'])})")

    # Backlog
    lines.append(f"📋 *Backlog:* {delta['backlog']['count']} issues ({format_delta(delta['backlog']['delta'])})")

    return '\n'.join(lines)

def send_slack_message(token: str, channel: str, message: str, dry_run: bool = False):
    """Send message to Slack (or just print if dry_run)"""

    if dry_run:
        print("\n" + "="*80)
        print("SLACK MESSAGE (DRY RUN - NOT SENT):")
        print("="*80)
        print(message)
        print("="*80)
        return

    print(f"\n📨 Sending message to Slack channel {channel}...")

    url = "https://slack.com/api/chat.postMessage"
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    payload = {
        'channel': channel,
        'text': message,
        'mrkdwn': True
    }

    response = requests.post(url, headers=headers, json=payload)
    result = response.json()

    if result.get('ok'):
        print(f"✅ Message sent successfully!")
        print(f"   Message ID: {result.get('ts')}")
    else:
        print(f"❌ Failed to send message: {result.get('error')}")

def main(dry_run: bool = True):
    """Main execution"""
    print("="*80)
    print("🚀 GitHub Issue Summary - Local Test")
    print("="*80)

    try:
        # Step 1: Fetch secrets
        print("\n[Step 1/6] Fetching secrets from AWS Secrets Manager...")
        github_secret = get_secret('github-token')
        github_token = github_secret['GITHUB_TOKEN']
        print("✅ GitHub token loaded")

        slack_secret = get_secret('chinchilla-ai-academy/slack')
        slack_token = slack_secret['SLACK_BOT_TOKEN']
        print("✅ Slack token loaded")

        # Step 2: Fetch GitHub issues
        print(f"\n[Step 2/6] Fetching issues from GitHub...")
        issues = fetch_github_issues(GITHUB_REPO_OWNER, GITHUB_REPO_NAME, github_token)

        # Step 3: Categorize issues
        print(f"\n[Step 3/6] Categorizing issues by label...")
        current_snapshot = categorize_issues(issues)

        # Step 4: Load previous snapshot
        print(f"\n[Step 4/6] Loading previous snapshot...")
        previous_snapshot = load_previous_snapshot()

        # Step 5: Calculate delta
        print(f"\n[Step 5/6] Calculating delta...")
        delta = calculate_delta(current_snapshot, previous_snapshot)

        print("\n📈 Changes detected:")
        print(f"  Ready for Testing: {format_delta(delta['readyForTesting']['delta'])} ({delta['readyForTesting']['count']} total)")
        print(f"  In Progress: {format_delta(delta['inProgress']['delta'])} ({delta['inProgress']['count']} total)")
        print(f"  Blocked: {format_delta(delta['blocked']['delta'])} ({delta['blocked']['count']} total)")
        print(f"  Backlog: {format_delta(delta['backlog']['delta'])} ({delta['backlog']['count']} total)")

        # Step 6: Format and send Slack message
        print(f"\n[Step 6/6] Formatting Slack message...")
        message = format_slack_message(GITHUB_REPO_NAME, delta)
        send_slack_message(slack_token, SLACK_CHANNEL_ID, message, dry_run=dry_run)

        # Save snapshot
        save_snapshot(current_snapshot)

        print("\n✅ Test completed successfully!")

        if dry_run:
            print("\n💡 To actually send to Slack, run: python test-github-issue-summary.py --send")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0

if __name__ == "__main__":
    import sys

    # Check for --send flag
    send_to_slack = '--send' in sys.argv
    dry_run = not send_to_slack

    exit(main(dry_run=dry_run))
