# Amplify Gen 2 Implementation Patterns

**Quick Navigation for AI Assistants**

This directory contains prescriptive, copy-paste-ready implementation patterns for AWS Amplify Gen 2 features.

---

## 📊 Data & Backend

### Connect Amplify Data to Frontend
**Task:** Wire up Amplify Data Client to a React component for CRUD operations and real-time updates
**Read:** `data/connect-frontend.md`

---

## 🔐 Authentication

### Add Basic Email Authentication
**Task:** Set up email/password authentication with verification and password reset
**Read:** `auth/add-basic-auth.md`

### Add Social Login (Google, Facebook, Apple, Amazon)
**Task:** Add social authentication providers with OAuth
**Read:** `auth/add-social-login.md`

### Add Multi-Factor Authentication (MFA)
**Task:** Set up SMS and TOTP (authenticator app) MFA
**Read:** `auth/add-mfa.md`

### Access User Context Throughout App
**Task:** Get current user, attributes, and roles in any component
**Read:** `auth/access-user-context.md`

### Set Up Authentication Triggers
**Task:** Add Lambda triggers to Cognito lifecycle events (pre-signup, post-confirmation, etc.)
**Read:** `auth/setup-triggers.md`

---

## ⚡ Functions & API

### 🔐 Authorize Lambda to Access Data (FOUNDATIONAL)
**Task:** Connect ANY Lambda function to Amplify Data / DynamoDB
**Read:** `functions/authorize-lambda-with-data.md`
**Required for:** ALL function types (scheduled, GraphQL, webhooks, triggers)

---

### Add Custom GraphQL Resolver
**Task:** Create custom GraphQL queries and mutations with Lambda functions
**Read:** `functions/custom-graphql-resolver.md`
**Prerequisites:** `authorize-lambda-with-data.md`

### Add Scheduled Function (Cron Jobs)
**Task:** Create Lambda functions that run on a schedule using EventBridge
**Read:** `functions/scheduled-function.md`
**Prerequisites:** `authorize-lambda-with-data.md`

---

## 📁 Storage & Files (Coming Soon)
- File uploads with S3
- Display uploaded images
- Download files

---

## How to Use This Guide

1. **Identify your task** from the categories above
2. **Read the specified markdown file** for step-by-step instructions
3. **Copy-paste the patterns** and adjust for your specific use case
4. **All patterns are production-ready** and follow Amplify Gen 2 best practices

---

**Note:** These are not exploratory examples - they are precise, prescriptive blueprints. Follow them exactly for guaranteed success.
