#!/bin/bash

# Update GitHub token in AWS Secrets Manager
# Usage: ./scripts/update-github-token.sh YOUR_NEW_TOKEN

set -e

if [ -z "$1" ]; then
  echo "❌ Error: GitHub token required"
  echo "Usage: ./scripts/update-github-token.sh YOUR_NEW_TOKEN"
  exit 1
fi

TOKEN="$1"

echo "🔐 Updating GitHub token in AWS Secrets Manager..."

# Update the secret
aws secretsmanager update-secret \
  --secret-id github-token \
  --region us-east-1 \
  --secret-string "{\"GITHUB_TOKEN\":\"$TOKEN\"}"

echo "✅ GitHub token updated successfully!"
echo ""
echo "Next steps:"
echo "1. Update .env.local: GITHUB_TOKEN=$TOKEN"
echo "2. Wait for sandbox to redeploy (~30 seconds)"
echo "3. Try the 'Sync Now' button again"
