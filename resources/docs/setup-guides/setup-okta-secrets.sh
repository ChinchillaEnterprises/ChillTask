#!/bin/bash

# Okta OAuth Setup Script
# This script sets up the Okta OAuth secrets in AWS Systems Manager Parameter Store

echo "🔐 Setting up Okta OAuth Secrets in AWS..."

# Your Okta OAuth App credentials
OKTA_CLIENT_ID="0oavkuhgkd3EzQsrC697"
OKTA_CLIENT_SECRET="V0ADKGnD6r4tJCo86I3lDwJb4lpCh5cRTSti_VUz9CbdlD3c9uUQPFGWT-5XJEQs"

# AWS Region (change if needed)
AWS_REGION="us-east-1"

# Set the secrets in AWS Systems Manager Parameter Store
echo "📝 Setting OKTA_CLIENT_ID..."
npx ampx sandbox secret set OKTA_CLIENT_ID --value "$OKTA_CLIENT_ID"

echo "📝 Setting OKTA_CLIENT_SECRET..."
npx ampx sandbox secret set OKTA_CLIENT_SECRET --value "$OKTA_CLIENT_SECRET"

echo "✅ Okta OAuth secrets have been configured!"
echo ""
echo "📌 Next steps:"
echo "1. Make sure your sandbox is running: npx ampx sandbox"
echo "2. The Okta sign-in button will appear alongside Google"
echo "3. Test the Okta OAuth flow"
echo ""
echo "🔗 Okta Domain: https://trial-7156045-admin.okta.com"
echo "🔗 Issuer URL: https://trial-7156045-admin.okta.com/oauth2/default"