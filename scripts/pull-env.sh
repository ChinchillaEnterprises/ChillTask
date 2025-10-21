#!/bin/bash

# Pull environment variables from AWS Secrets Manager and create .env.local
# Usage: ./scripts/pull-env.sh

set -e

echo "🔐 Pulling environment variables from AWS Secrets Manager..."

# Fetch the secret from AWS
SECRET_JSON=$(aws secretsmanager get-secret-value \
  --secret-id chilltask-env \
  --region us-east-1 \
  --query SecretString \
  --output text)

# Convert JSON to .env format
echo "# ChillTask Environment Variables" > .env.local
echo "# Auto-generated from AWS Secrets Manager (chilltask-env)" >> .env.local
echo "# Last updated: $(date)" >> .env.local
echo "" >> .env.local

# Parse JSON and write to .env.local
echo "$SECRET_JSON" | jq -r 'to_entries | .[] | "\(.key)=\(.value)"' >> .env.local

echo "✅ Environment variables pulled successfully!"
echo "📄 Created: .env.local"
echo ""
echo "Variables loaded:"
cat .env.local | grep -v "^#" | grep -v "^$" | cut -d= -f1
