# Docker Lambda Functions with AWS Amplify Gen2 (TypeScript/Node.js)

**Complete Guide to Deploying TypeScript Lambda with Docker and Amplify**

*Last Updated: November 2025*

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Why Docker Lambda for TypeScript?](#why-docker-lambda-for-typescript)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Implementation](#step-by-step-implementation)
5. [Complete Code Examples](#complete-code-examples)
6. [Testing & Deployment](#testing--deployment)
7. [Troubleshooting](#troubleshooting)
8. [Best Practices](#best-practices)
9. [Real-World Implementation](#real-world-implementation)

---

## The Problem

### When You Need Docker Lambda for Node.js/TypeScript

You need Docker Lambda when your TypeScript/Node.js function requires:

1. **System binaries not available in standard Lambda runtime**
   - Example: `yt-dlp`, `ffmpeg`, `chromium`, `imagemagick`

2. **Mixed language dependencies**
   - Example: Node.js function that needs Python tools

3. **Native modules with specific compilation requirements**
   - Example: `sharp`, `canvas`, `sqlite3` with custom builds

4. **Dependencies exceeding 250MB uncompressed**
   - Docker Lambda has 10GB limit (40x larger!)

### Why Standard `defineFunction()` Isn't Enough

Amplify Gen2's `defineFunction()` only supports:
- Pure Node.js/TypeScript code
- Dependencies from npm
- Standard Lambda runtime environment

It **DOES NOT** support:
- Custom system binaries
- Docker containers
- Multi-language dependencies

---

## Why Docker Lambda for TypeScript?

### The Modern Approach (2025)

**Docker Container Lambda is now the recommended approach** for any Lambda function that needs system-level dependencies.

**Advantages:**
- ✅ 10 GB image size limit (vs 250MB for zip)
- ✅ Install any system packages (`dnf install`)
- ✅ Mix languages (Node.js + Python + binaries)
- ✅ No hacky workarounds or layer optimization
- ✅ Reproducible builds
- ✅ Version control for entire runtime

**Trade-offs:**
- ⚠️ Requires Docker locally (use Colima on Mac)
- ⚠️ Requires CDK escape hatch (no `defineFunction()`)
- ⚠️ Slightly longer cold starts (usually <1s extra)
- ⚠️ Manual IAM grants (no `resourceGroupName` magic)

---

## Prerequisites

### Local Development

- **Node.js 18+**: For Amplify Gen2
- **Docker Runtime**: Docker Desktop OR Colima (recommended for Mac)
- **AWS CLI**: Configured with credentials
- **Amplify CLI**: `npm install -g @aws-amplify/cli`

### Docker Setup (Mac with Colima)

```bash
# Install Colima (Docker Desktop alternative)
brew install colima

# Start with sufficient resources
colima start --memory 4 --cpu 2

# Verify Docker works
docker ps
```

### AWS Permissions

Your IAM user/role needs:
- Lambda function creation
- ECR repository creation (CDK creates automatically)
- CloudFormation stack management
- S3 access (for assets)

---

## Step-by-Step Implementation

### Step 1: Create Function Directory Structure

```
amplify/
└── functions/
    └── youtube-processor/     # Your function name
        ├── handler.ts         # TypeScript handler
        ├── package.json       # Node.js dependencies
        ├── Dockerfile         # Docker build instructions
        └── tsconfig.json      # Optional: TypeScript config
```

### Step 2: Create TypeScript Handler

**`amplify/functions/youtube-processor/handler.ts`:**

```typescript
export const handler = async (event: any) => {
  console.log('Event:', JSON.stringify(event, null, 2));

  // Your Lambda logic here
  const result = await processVideo(event);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Success', result })
  };
};

async function processVideo(event: any) {
  // Example: Call system binary installed in Docker
  const { spawn } = await import('child_process');

  return new Promise((resolve, reject) => {
    const process = spawn('yt-dlp', ['--version']);

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Process exited with code ${code}`));
      }
    });
  });
}
```

**Key Points:**
- Export a `handler` function (required by Lambda)
- Use `async/await` for asynchronous operations
- Import Node.js modules with `await import()` for better tree-shaking

### Step 3: Create package.json

**`amplify/functions/youtube-processor/package.json`:**

```json
{
  "name": "youtube-processor",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "@aws-sdk/lib-dynamodb": "^3.0.0",
    "@aws-sdk/client-secrets-manager": "^3.0.0"
  }
}
```

**Important:**
- Keep dependencies minimal (only runtime dependencies)
- Use `"type": "module"` if you want ES modules
- esbuild will bundle everything, so dev dependencies not needed here

### Step 4: Create Dockerfile

**`amplify/functions/youtube-processor/Dockerfile`:**

```dockerfile
# YouTube Processor Lambda with yt-dlp
FROM public.ecr.aws/lambda/nodejs:20

# Install system dependencies (Python + yt-dlp binary)
# Note: Node.js 20 base image uses dnf (not yum)
RUN dnf install -y python3 && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# Copy package.json and install Node.js dependencies
COPY package.json ${LAMBDA_TASK_ROOT}/
RUN npm install --production

# Copy TypeScript handler
COPY handler.ts ${LAMBDA_TASK_ROOT}/

# Compile TypeScript with esbuild (AWS recommended pattern)
RUN npm install -g esbuild && \
    esbuild handler.ts \
      --bundle \
      --platform=node \
      --target=es2020 \
      --outfile=index.js

# CRITICAL: CMD must match esbuild output filename
# index.js → index.handler
CMD [ "index.handler" ]
```

**Critical Rules:**

1. **CMD MUST Match Output Filename**
   ```dockerfile
   --outfile=index.js
   CMD [ "index.handler" ]  # ✅ Correct

   --outfile=handler.js
   CMD [ "handler.handler" ]  # ✅ Also correct

   --outfile=index.js
   CMD [ "handler.handler" ]  # ❌ WRONG! Will fail with InvalidEntrypoint
   ```

2. **Use Node.js 20 Package Manager (`dnf`)**
   ```dockerfile
   # ✅ Correct for Node.js 20
   RUN dnf install -y python3

   # ❌ Wrong - yum not found in Node.js 20 image
   RUN yum install -y python3
   ```

3. **Don't Specify `--format` Flag**
   ```dockerfile
   # ✅ Let esbuild auto-detect
   esbuild handler.ts --bundle --platform=node --outfile=index.js

   # ❌ Avoid specifying format (can cause issues)
   esbuild handler.ts --bundle --format=esm --outfile=index.js
   ```

4. **⚠️ CRITICAL: Choose ARM64 vs AMD64 Architecture**

   **If you have Apple Silicon Mac (M1/M2/M3):**

   ✅ **Use ARM64 Lambda** (recommended - native to your Mac!)

   ```dockerfile
   # Use default image (auto-detects ARM64)
   FROM public.ecr.aws/lambda/nodejs:20
   ```

   ```typescript
   // In backend.ts
   architecture: lambda.Architecture.ARM_64  // ← Add this!
   ```

   **Why ARM64 for Mac Users?**
   - ✅ No cross-compilation needed
   - ✅ 20-34% cheaper than AMD64
   - ✅ Native build on your Mac (faster)
   - ✅ Same or better performance

   **If you have Intel Mac or need AMD64:**

   ```dockerfile
   # Explicitly use AMD64
   FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:20
   ```

   ```typescript
   // In backend.ts (AMD64 is default, but you can be explicit)
   architecture: lambda.Architecture.X86_64
   ```

   **⚠️ Common Mistake:** Using `--platform=linux/amd64` on Apple Silicon Mac without Docker Buildx will cause `Runtime.InvalidEntrypoint` errors!

### Step 5: Configure CDK in backend.ts

**`amplify/backend.ts`:**

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Duration } from 'aws-cdk-lib';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const backend = defineBackend({
  auth,
  data,
});

// Create custom stack for Docker Lambda
const customStack = backend.createStack('youtube-processor-stack');

// Create Docker Lambda function
const youtubeProcessorFunction = new lambda.DockerImageFunction(
  customStack,
  'YouTubeProcessor',
  {
    code: lambda.DockerImageCode.fromImageAsset(
      join(__dirname, 'functions', 'youtube-processor')
    ),
    architecture: lambda.Architecture.ARM_64,  // ← Use ARM64 for Apple Silicon Macs!
    timeout: Duration.minutes(2),
    memorySize: 512,
    description: 'Process YouTube videos with yt-dlp',
  }
);

// MANUAL PATTERN: Grant DynamoDB table access
// (Docker Lambda doesn't support resourceGroupName: 'data')
const processedVideoTable = backend.data.resources.tables['ProcessedVideo'];
processedVideoTable.grantReadWriteData(youtubeProcessorFunction);

// MANUAL PATTERN: Inject table name as environment variable
youtubeProcessorFunction.addEnvironment(
  'PROCESSED_VIDEO_TABLE_NAME',
  processedVideoTable.tableName
);

// Optional: Add EventBridge schedule
const rule = new Rule(customStack, 'HourlyYouTubeProcessing', {
  schedule: Schedule.rate(Duration.hours(1)),
});
rule.addTarget(new LambdaFunction(youtubeProcessorFunction));
```

**Key Differences from `defineFunction()`:**

| Feature | `defineFunction()` | Docker Lambda (`DockerImageFunction`) |
|---------|-------------------|--------------------------------------|
| **DynamoDB Access** | `resourceGroupName: 'data'` ✅ | Manual `grantReadWriteData()` ⚠️ |
| **Environment Variables** | Auto-injected ✅ | Manual `addEnvironment()` ⚠️ |
| **Dependencies** | npm only | Any system packages ✅ |
| **Size Limit** | 250MB | 10GB ✅ |
| **Cold Start** | ~100ms | ~100-500ms |

### Step 6: Configure Amplify Build Environment

#### 6a. Update amplify.yml (Required for CI/CD)

**`amplify.yml`:**

```yaml
version: 1
backend:
  phases:
    preBuild:
      commands:
        # Start Docker daemon (required for building Docker Lambda)
        - /usr/local/bin/dockerd-entrypoint.sh
    build:
      commands:
        - npm ci
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
      - .next/cache/**/*
```

**Critical line:** `/usr/local/bin/dockerd-entrypoint.sh` starts Docker daemon

#### 6b. Set Custom Build Image in Amplify Console

1. Go to **Amplify Console** → Your App
2. Navigate to **Hosting** → **Build settings**
3. Scroll to **Build image settings**
4. Click **Edit**
5. Select **Custom image**
6. Enter: `public.ecr.aws/codebuild/amazonlinux-x86_64-standard:5.0`
7. Save

**Why this image?**
- AWS official CodeBuild image
- Includes Docker pre-installed
- Supports multi-platform builds

**Without this, builds fail with:** `Cannot connect to Docker daemon`

---

## Complete Code Examples

### Example 1: Simple TypeScript Lambda with Binary

**Use Case:** Call yt-dlp to get video info

```typescript
// handler.ts
export const handler = async (event: { videoUrl: string }) => {
  const { spawn } = await import('child_process');
  const { promisify } = await import('util');
  const exec = promisify((await import('child_process')).exec);

  // Call yt-dlp binary installed in Docker
  const { stdout } = await exec(`yt-dlp --dump-json ${event.videoUrl}`);
  const videoInfo = JSON.parse(stdout);

  return {
    statusCode: 200,
    body: JSON.stringify({
      title: videoInfo.title,
      duration: videoInfo.duration,
      views: videoInfo.view_count
    })
  };
};
```

### Example 2: DynamoDB Integration (Direct SDK)

```typescript
// handler.ts
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: any) => {
  const tableName = process.env.PROCESSED_VIDEO_TABLE_NAME;

  if (!tableName) {
    throw new Error('PROCESSED_VIDEO_TABLE_NAME environment variable not set');
  }

  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: {
      id: `video-${Date.now()}`,
      processedAt: new Date().toISOString(),
      status: 'complete'
    }
  }));

  return { statusCode: 200 };
};
```

---

## Testing & Deployment

### Test in Sandbox

```bash
# Start sandbox (auto-rebuilds on file changes)
npx ampx sandbox --stream-function-logs

# In another terminal, test the Lambda
aws lambda invoke \
  --function-name <function-name-from-sandbox> \
  --payload '{"videoUrl":"https://youtube.com/watch?v=..."}' \
  response.json

# View response
cat response.json
```

### Deploy to Production

```bash
# Commit changes
git add .
git commit -m "Add Docker Lambda with yt-dlp"

# Push to trigger Amplify deployment
git push

# Monitor deployment in Amplify Console
```

---

## Troubleshooting

### Error: `Runtime.InvalidEntrypoint`

**Symptom:**
```
INIT_REPORT Init Duration: 8.31 ms  Phase: init  Status: error  Error Type: Runtime.InvalidEntrypoint
```

**Cause:** CMD in Dockerfile doesn't match esbuild output filename

**Fix:**
```dockerfile
# If you have this:
--outfile=index.js

# Then CMD MUST be:
CMD [ "index.handler" ]

# NOT:
CMD [ "handler.handler" ]  # ❌ Wrong!
```

### Error: `yum: command not found`

**Symptom:**
```
/bin/sh: yum: command not found
```

**Cause:** Node.js 20 Lambda base image uses `dnf` not `yum`

**Fix:**
```dockerfile
# ✅ Correct
RUN dnf install -y python3

# ❌ Wrong
RUN yum install -y python3
```

### Error: `Cannot find module '@aws-sdk/...'`

**Symptom:** TypeScript validation fails before Docker build

**Cause:** Packages only exist in Docker container, not in local project

**Fix:** Install as devDependencies for type-checking:
```bash
npm install --save-dev @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb
```

### Error: Docker daemon not running

**Symptom:**
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock
```

**Fix:**
```bash
# Start Docker (Mac with Colima)
colima start --memory 4 --cpu 2

# Verify
docker ps
```

### Error: AWS Lambda InvalidEntrypoint (works locally but fails in AWS)

**Symptom:**
```
Runtime.InvalidEntrypoint
Error: ProcessSpawnFailed
```

**BUT:** Local Docker testing works perfectly:
```bash
docker run --rm -p 9000:8080 <image> &
curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
# ✅ Returns successful response with logs
```

**🎯 Most Common Cause (90% of cases): Architecture Mismatch**

If you have an **Apple Silicon Mac (M1/M2/M3)** and used `--platform=linux/amd64`:

**The Problem:**
- You built for AMD64 on an ARM64 Mac
- Docker couldn't cross-compile (requires buildx)
- Image appears to work locally (Rosetta 2 emulation)
- AWS Lambda can't run the ARM64 binaries on AMD64 infrastructure

**The Solution:**
✅ **Use ARM64 Lambda natively!**

1. Remove `--platform` from Dockerfile:
   ```dockerfile
   # ❌ Remove this
   FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:20

   # ✅ Use this
   FROM public.ecr.aws/lambda/nodejs:20
   ```

2. Add `architecture` to backend.ts:
   ```typescript
   architecture: lambda.Architecture.ARM_64  // ← Add this!
   ```

3. Redeploy - it will work immediately!

**Why This Works:**
- AWS Lambda supports ARM64 (Graviton2)
- Your Mac builds ARM64 natively (no cross-compilation)
- 20-34% cheaper than AMD64
- Same or better performance

**Alternative Solutions (if you must use AMD64):**
1. Install Docker Buildx for cross-compilation
2. Build on an AMD64 machine (CI/CD)
3. Deploy to production (uses cloud builders)

**Other Debugging steps:**
1. **Verify the image locally first:**
   ```bash
   # Pull the exact image AWS Lambda is using
   IMAGE_URI=$(aws lambda get-function --function-name YOUR_FUNCTION | jq -r '.Code.ImageUri')
   docker pull $IMAGE_URI

   # Test locally
   docker run --rm -p 9000:8080 $IMAGE_URI &
   sleep 2
   curl -X POST "http://localhost:9000/2015-03-31/functions/function/invocations" -d '{}'
   ```

2. **Verify the CMD:**
   ```bash
   docker inspect $IMAGE_URI | jq '.[0].Config.Cmd'
   # Should show: ["index.handler"]
   ```

3. **Verify exports in compiled code:**
   ```bash
   docker run --rm --entrypoint grep $IMAGE_URI "module.exports" /var/task/index.js
   # Should show: module.exports = __toCommonJS(handler_exports);
   ```

**Possible causes:**
- AWS Lambda runtime caching (very rare)
- Platform mismatch (ensure `--platform=linux/amd64` in Dockerfile)
- CDK CloudFormation not propagating image updates correctly

**Nuclear option - Force complete rebuild:**
```bash
# Delete the Lambda function entirely and recreate
# This forces AWS to pull the fresh image
aws lambda delete-function --function-name YOUR_FUNCTION
# Then redeploy via sandbox or git push
```

**Workaround:** If local testing proves the image works, the Lambda will likely work correctly when triggered by EventBridge or other AWS services (not just manual invoke).

---

## Best Practices

### 1. Dockerfile Layer Caching

```dockerfile
# ✅ Good: Copy package.json first, then install
COPY package.json ${LAMBDA_TASK_ROOT}/
RUN npm install --production
COPY handler.ts ${LAMBDA_TASK_ROOT}/

# ❌ Bad: Changes to handler.ts invalidate npm install cache
COPY . ${LAMBDA_TASK_ROOT}/
RUN npm install --production
```

### 2. Minimal Dependencies

```json
// ✅ Good: Only runtime dependencies
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0"
  }
}

// ❌ Bad: Including dev dependencies bloats image
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.0.0",
    "typescript": "^5.0.0",  // Not needed at runtime!
    "esbuild": "^0.19.0"     // Installed globally in Docker
  }
}
```

### 3. Environment Variables

```typescript
// ✅ Good: Validate environment variables
const tableName = process.env.TABLE_NAME;
if (!tableName) {
  throw new Error('TABLE_NAME not set');
}

// ❌ Bad: Assume env vars exist
const tableName = process.env.TABLE_NAME!;  // Could be undefined!
```

---

## Real-World Implementation

### Our YouTube Processor Implementation

**What it does:**
- Scheduled Lambda (runs hourly via EventBridge)
- Downloads YouTube video captions using `yt-dlp` binary
- Summarizes transcripts with Claude API (map-reduce for long videos)
- Posts summaries to Slack
- Stores results in DynamoDB

**Key learnings:**
1. ✅ Started with Python handbook → realized we needed TypeScript version
2. ✅ Tried `youtube-dl-exec` npm package → failed with postinstall errors
3. ✅ Solution: Use yt-dlp binary directly via `spawn()`
4. ✅ Initial CMD was wrong (`handler.handler`) → fixed to `index.handler`
5. ✅ Missing `-o` flag in curl → binary downloaded but not saved
6. ✅ Handbook had zero Node.js examples → created this guide!

**Files:**
- `amplify/functions/youtube-processor/handler.ts` (350 lines)
- `amplify/functions/youtube-processor/Dockerfile` (29 lines)
- `amplify/backend.ts` (Docker Lambda setup)

---

## Summary

### When to Use Docker Lambda (TypeScript)

✅ **Use Docker Lambda when:**
- Need system binaries (`yt-dlp`, `ffmpeg`, `chromium`)
- Dependencies exceed 250MB
- Require mixed languages (Node.js + Python)
- Want reproducible, version-controlled runtime

❌ **Use Standard `defineFunction()` when:**
- Pure Node.js/TypeScript code
- Dependencies < 250MB
- No system binaries needed
- Want automatic DynamoDB access via `resourceGroupName`

### Critical Rules

1. **CMD must match esbuild output:** `--outfile=X.js` → `CMD ["X.handler"]`
2. **Use `dnf` not `yum`** for Node.js 20 base image
3. **Manual IAM grants** for DynamoDB/S3 (no `resourceGroupName` magic)
4. **Custom build image** required in Amplify Console
5. **Start Docker daemon** in `amplify.yml` preBuild phase

---

## References

- [AWS Lambda Docker Images (TypeScript)](https://docs.aws.amazon.com/lambda/latest/dg/typescript-image.html)
- [AWS Lambda Base Images](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-images.html)
- [esbuild Documentation](https://esbuild.github.io/)
- [Amplify Gen2 CDK Escape Hatches](https://docs.amplify.aws/react/build-a-backend/functions/custom-resources/)

**Created:** November 2025
**Based on:** Real-world implementation of YouTube video processor with yt-dlp
