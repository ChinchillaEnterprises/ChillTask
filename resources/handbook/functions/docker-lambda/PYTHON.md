# Docker Lambda Functions with AWS Amplify Gen2

**Complete Guide to Deploying ML/Heavy Python Dependencies with Amplify**

*Last Updated: January 2025*

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Research & Discovery](#research--discovery)
3. [The Solution](#the-solution)
4. [Prerequisites](#prerequisites)
5. [Step-by-Step Implementation](#step-by-step-implementation)
6. [Complete Code Examples](#complete-code-examples)
7. [Testing & Deployment](#testing--deployment)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [Real-World Implementation Lessons](#real-world-implementation-lessons) ⭐ NEW
11. [References & Credits](#references--credits)

---

## The Problem

### Why Standard Lambda Deployment Fails for ML Workloads

AWS Lambda has size limitations that make deploying machine learning models challenging:

- **Deployment package limit**: 250 MB (uncompressed)
- **Lambda Layer limit**: 250 MB (uncompressed) across all layers
- **/tmp storage**: 512 MB

**Our Use Case:**
We needed to deploy XGBoost-based commodity price prediction models with dependencies:
- `numpy` (~15MB)
- `pandas` (~40MB)
- `scikit-learn` (~80MB)
- `xgboost` (~150MB)
- `scikit-optimize` (~20MB)

**Total: ~305MB uncompressed** - exceeds the 250MB limit!

### Why Amplify Gen2's `defineFunction()` Isn't Enough

Amplify Gen2 provides clean abstractions for AWS services:

```typescript
defineAuth(...)      // ✅ Cognito
defineData(...)      // ✅ AppSync + DynamoDB
defineStorage(...)   // ✅ S3
defineFunction(...)  // ✅ Lambda (Node.js/TypeScript only)
```

**What's Missing:**
```typescript
defineFunction({
  runtime: 'docker'  // ❌ DOESN'T EXIST
})
```

Amplify Gen2 has **no native abstraction** for Docker-based Lambda functions, forcing us to use CDK escape hatches.

---

## Research & Discovery

### Community Best Practices (January 2025)

We researched multiple approaches from the AWS community:

#### Option 1: Lambda Layers ⚠️
**Pros:**
- Works with Amplify's `defineFunction()`
- Relatively simple setup

**Cons:**
- Still hits 250MB limit
- Requires heavy optimization (stripping .so files, removing test directories)
- Compatibility issues common (numpy import errors)
- Fragile - breaks with updates

**Verdict:** Not recommended for ML workloads

#### Option 2: EFS Mount 🤔
**Pros:**
- Can handle very large models (multi-GB)
- Supported by AWS samples

**Cons:**
- More expensive (EFS costs)
- Complex setup (VPC, security groups)
- Cold start latency (mounting filesystem)
- Overkill for our use case

**Verdict:** Good for huge models, unnecessary for us

#### Option 3: Docker Container Lambda ✅
**Pros:**
- **10 GB size limit** (40x larger than standard Lambda!)
- AWS has official samples for XGBoost/scikit-learn
- No hacky optimizations needed
- Community consensus: modern best practice

**Cons:**
- Requires CDK escape hatch in Amplify Gen2
- Needs custom CodeBuild configuration

**Verdict:** Winner! This is the modern approach.

### Key Resources That Guided Our Decision

1. **AWS Official Sample**: [`aws-samples/aws-lambda-docker-serverless-inference`](https://github.com/aws-samples/aws-lambda-docker-serverless-inference)
   - Demonstrates XGBoost, scikit-learn, TensorFlow, PyTorch
   - Production-ready patterns

2. **GitHub Issue**: [aws-amplify/amplify-backend#2386](https://github.com/aws-amplify/amplify-backend/issues/2386)
   - Confirms Docker Lambda requires CDK escape hatch
   - Shows `DockerImageFunction` pattern

3. **Stack Overflow Consensus**: Multiple threads agree Docker is preferred over layers for ML

---

## The Solution

### The Critical Discovery: Felipe's Article

**IMPORTANT:** We discovered a critical build environment issue thanks to this article:

**"Using Docker in AWS Amplify Builds: A Step-by-Step Guide"**
*By Felipe Malaquias, April 2025*
[Read on Medium](https://medium.com/@AlexeyButyrev/using-docker-in-aws-amplify-builds)

**The Problem Felipe Solved:**

When using `DockerImageFunction` with Amplify Gen2, CDK needs to **build your Docker image during deployment**. However:

1. Amplify's default CodeBuild environment **doesn't have Docker installed**
2. Builds fail with cryptic error: `[CDKAssetPublishError] CDK failed to publish assets`
3. Hidden in logs: `Unable to execute 'docker'`

**The Fix:**

1. Use custom CodeBuild image with Docker: `public.ecr.aws/codebuild/amazonlinux-x86_64-standard:5.0`
2. Start Docker daemon in `amplify.yml`: `/usr/local/bin/dockerd-entrypoint.sh`

**Without this knowledge, you'd waste 2-3 hours debugging!** 🙏 Thank you, Felipe!

---

## Prerequisites

### Required Tools

- **Docker Desktop**: For local testing and building images
- **AWS CLI**: For AWS credentials
- **Node.js 18+**: For Amplify Gen2
- **Git**: For version control

### Required Knowledge

- Basic understanding of AWS Lambda
- Familiarity with Docker and Dockerfiles
- Experience with Amplify Gen2 basics
- CDK concepts (escape hatches)

### AWS Permissions

Your IAM user/role needs:
- Lambda function creation
- ECR repository creation (CDK creates automatically)
- CloudFormation stack management
- S3 access (for assets)

---

## Step-by-Step Implementation

### Step 1: Set Up Function Directory Structure

Create your function directory with Python code and Dockerfile:

```
amplify/
└── functions/
    └── commodity-pipelines/
        └── corn/
            ├── Dockerfile
            ├── requirements.txt
            ├── handler.py
            ├── s3_data_reader.py
            ├── data_preprocessor.py
            └── predictor.py
```

### Step 2: Create requirements.txt

List all Python dependencies:

```txt
# requirements.txt
boto3==1.34.0
numpy==1.26.3
pandas==2.1.4
scikit-learn==1.4.0
xgboost==2.0.3
scikit-optimize==0.9.0
```

**Note:** `boto3` is included in Lambda runtime, but explicit version ensures consistency.

### Step 3: Create Dockerfile

**Critical Points:**
- Use AWS official Lambda Python base image
- Copy code BEFORE installing dependencies (better caching)
- Set CMD to your handler function

```dockerfile
# Use AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.11

# Copy requirements first (better Docker layer caching)
COPY requirements.txt ${LAMBDA_TASK_ROOT}/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py ${LAMBDA_TASK_ROOT}/

# Set the handler function
CMD ["handler.lambda_handler"]
```

**Why this structure?**
- `FROM public.ecr.aws/lambda/python:3.11`: AWS-provided image with Lambda runtime
- `${LAMBDA_TASK_ROOT}`: Lambda's working directory (`/var/task/`)
- `--no-cache-dir`: Reduces image size
- `CMD ["handler.lambda_handler"]`: Points to `handler.py` → `lambda_handler()` function

### Step 4: Create Python Handler

Create `handler.py` with Lambda handler function:

```python
import json
import boto3
from datetime import datetime
from s3_data_reader import S3DataReader
from data_preprocessor import DataPreprocessor
from predictor import Predictor

def lambda_handler(event, context):
    """
    AWS Lambda handler for commodity prediction pipeline

    Triggered by EventBridge on schedule
    """
    print(f"=== Corn Prediction Pipeline Started ===")
    print(f"Event: {json.dumps(event)}")

    try:
        # Your prediction logic here
        # 1. Load data from S3
        # 2. Preprocess
        # 3. Run model prediction
        # 4. Save results to DynamoDB

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Prediction completed',
                'timestamp': datetime.now().isoformat()
            })
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            })
        }
```

### Step 5: Update backend.ts with CDK Escape Hatch

Edit `amplify/backend.ts` to add Docker Lambda function:

```typescript
import { defineBackend } from '@aws-amplify/backend';
import { Stack, Duration } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { auth } from './auth/resource';
import { data } from './data/resource';
import { storage } from './storage/resource';

/**
 * Define Amplify backend with standard resources
 */
const backend = defineBackend({
  auth,
  data,
  storage,
});

/**
 * CDK ESCAPE HATCH: Docker Lambda Function
 *
 * Amplify Gen2 doesn't have native Docker Lambda support,
 * so we use CDK constructs directly.
 */

// Create a custom stack for Docker Lambda functions
const customStack = backend.createStack('custom-functions-stack');

// Define Docker-based Lambda function
const cornPredictionLambda = new lambda.DockerImageFunction(customStack, 'CornPredictionLambda', {
  functionName: 'CornPredictionPipeline',
  description: 'Corn price prediction using XGBoost model',

  // CRITICAL: This builds Docker image from directory
  code: lambda.DockerImageCode.fromImageAsset('./functions/commodity-pipelines/corn'),

  // Configuration
  timeout: Duration.minutes(10),      // ML inference can take time
  memorySize: 2048,                    // 2GB for model loading

  // Environment variables
  environment: {
    ENV: 'production',
    COMMODITY_TYPE: 'CORN',
    MODEL_BUCKET: 'gfy-commodity-predictions',
    REGION: 'us-east-1'
  }
});

/**
 * Grant Lambda access to Amplify-managed resources
 */

// S3 bucket access
backend.storage.resources.bucket.grantReadWrite(cornPredictionLambda);

// DynamoDB table access
const predictionTable = backend.data.resources.tables['CommodityPrediction'];
predictionTable.grantReadWriteData(cornPredictionLambda);

/**
 * EventBridge Schedule: Daily at 2:00 AM UTC
 */
const dailySchedule = new events.Rule(customStack, 'CornDailySchedule', {
  schedule: events.Schedule.cron({
    minute: '0',
    hour: '2',
    day: '*',
    month: '*',
    year: '*'
  }),
  description: 'Daily corn price prediction at 2 AM UTC'
});

// Add Lambda as target
dailySchedule.addTarget(new targets.LambdaFunction(cornPredictionLambda, {
  retryAttempts: 2,
  maxEventAge: Duration.hours(2)
}));

/**
 * Export function ARN for reference
 */
backend.addOutput({
  custom: {
    cornPredictionLambdaArn: cornPredictionLambda.functionArn
  }
});
```

**Key Points:**
- `backend.createStack()`: Creates new CloudFormation stack for custom resources
- `DockerImageCode.fromImageAsset()`: CDK builds Docker image automatically
- Relative path `./functions/...` resolved from `backend.ts` location
- Manual grants for S3/DynamoDB (no automatic `resourceGroupName` magic)

### Step 6: Configure Amplify Build Environment

**CRITICAL STEP** - Without this, branch deployments will fail!

#### 6a. Update amplify.yml

Create or update `amplify.yml` at repo root:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        # START DOCKER DAEMON (critical for CDK Docker builds!)
        - /usr/local/bin/dockerd-entrypoint.sh

        # Install dependencies
        - npm ci

        # Deploy backend with debug logs
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID --debug

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
- Compatible with Amplify requirements
- Supports Docker builds during deployment

**Without this change**: Builds will fail with `Unable to execute 'docker'`

### Step 7: Local Testing

#### Test 1: Build Docker Image Locally

```bash
cd amplify/functions/commodity-pipelines/corn

# Build image
docker build -t corn-prediction-test .

# Run locally (test handler)
docker run --rm \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  -e AWS_REGION=us-east-1 \
  corn-prediction-test
```

#### Test 2: Amplify Sandbox

```bash
# Start sandbox (will build Docker image)
npx ampx sandbox

# Monitor logs
npx ampx sandbox --stream-function-logs
```

**What happens:**
1. CDK builds Docker image from Dockerfile
2. Pushes image to ECR (auto-created)
3. Deploys Lambda with container image
4. Creates EventBridge schedule
5. Grants IAM permissions

**First run takes 5-10 minutes** (Docker build + ECR push)
**Subsequent runs: ~2 minutes** (CDK caches image)

---

## Complete Code Examples

### Full Python Handler Example

```python
# handler.py
import json
import os
import boto3
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from sklearn.preprocessing import MinMaxScaler

# Initialize AWS clients
s3_client = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

def lambda_handler(event, context):
    """
    Main Lambda handler for commodity prediction

    Args:
        event: EventBridge event (scheduled trigger)
        context: Lambda context

    Returns:
        dict: Response with statusCode and body
    """
    start_time = datetime.now()

    print(f"=== Corn Prediction Pipeline Started ===")
    print(f"Trigger: {event.get('source', 'manual')}")
    print(f"Time: {start_time.isoformat()}")

    try:
        # Step 1: Download model from S3
        model_bucket = os.environ['MODEL_BUCKET']
        model_key = 'models/corn/latest/xgboost_model.pkl'

        print(f"Downloading model: s3://{model_bucket}/{model_key}")

        model_path = '/tmp/model.pkl'
        s3_client.download_file(model_bucket, model_key, model_path)

        with open(model_path, 'rb') as f:
            model = pickle.load(f)

        print("✓ Model loaded")

        # Step 2: Fetch latest market data
        data_bucket = 'gfy-datalake'
        print(f"Fetching market data from s3://{data_bucket}/...")

        # Your data fetching logic here
        recent_prices = fetch_recent_prices(s3_client, data_bucket)

        # Step 3: Preprocess data
        print("Preprocessing data...")
        X_pred = preprocess_for_prediction(recent_prices)

        # Step 4: Run prediction
        print("Running XGBoost prediction...")
        prediction = model.predict(X_pred)

        predicted_price = float(prediction[0])
        current_price = float(recent_prices[-1])
        price_change = predicted_price - current_price
        direction = "UP" if price_change > 0 else "DOWN"

        print(f"Prediction: ${predicted_price:.2f} ({direction})")

        # Step 5: Save to DynamoDB
        table_name = os.environ.get('PREDICTION_TABLE', 'CommodityPrediction')
        table = dynamodb.Table(table_name)

        prediction_record = {
            'id': f"CORN_{datetime.now().isoformat()}",
            'commodity': 'CORN',
            'predictedPrice': predicted_price,
            'currentPrice': current_price,
            'priceChange': price_change,
            'direction': direction,
            'confidence': 0.85,  # From model
            'executedAt': datetime.now().isoformat(),
            'effectiveDate': (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d'),
            'isActive': True,
            'modelVersion': 'v1.0.0',
            'processingTimeMs': int((datetime.now() - start_time).total_seconds() * 1000)
        }

        table.put_item(Item=prediction_record)
        print(f"✓ Saved to DynamoDB: {prediction_record['id']}")

        # Step 6: Upload to legacy S3 for mobile app
        legacy_prediction = {
            'prediction_date': prediction_record['effectiveDate'],
            'predicted_price': predicted_price,
            'current_price': current_price,
            'direction': direction,
            'timestamp': prediction_record['executedAt']
        }

        legacy_key = 'predictions/latest/corn.json'
        s3_client.put_object(
            Bucket='gfy-commodity-predictions',
            Key=legacy_key,
            Body=json.dumps(legacy_prediction, indent=2),
            ContentType='application/json'
        )

        print(f"✓ Uploaded to s3://gfy-commodity-predictions/{legacy_key}")

        # Success response
        processing_time = (datetime.now() - start_time).total_seconds()
        print(f"=== Pipeline Complete ({processing_time:.2f}s) ===")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Prediction completed successfully',
                'commodity': 'CORN',
                'predicted_price': predicted_price,
                'direction': direction,
                'processing_time_seconds': processing_time,
                'timestamp': datetime.now().isoformat()
            })
        }

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

        # Save error to DynamoDB for monitoring
        try:
            table = dynamodb.Table(os.environ.get('PREDICTION_TABLE', 'CommodityPrediction'))
            table.put_item(Item={
                'id': f"CORN_ERROR_{datetime.now().isoformat()}",
                'commodity': 'CORN',
                'predictedPrice': 0,
                'confidence': 0,
                'executedAt': datetime.now().isoformat(),
                'isActive': False,
                'notes': f"Error: {str(e)}",
                'processingTimeMs': int((datetime.now() - start_time).total_seconds() * 1000)
            })
        except:
            pass

        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'commodity': 'CORN',
                'timestamp': datetime.now().isoformat()
            })
        }


def fetch_recent_prices(s3_client, bucket):
    """Fetch last 30 days of price data from S3"""
    # Implementation details...
    pass


def preprocess_for_prediction(prices):
    """Preprocess price data for XGBoost model"""
    # Implementation details...
    pass
```

### Dockerfile with Best Practices

```dockerfile
# Use AWS Lambda Python 3.11 base image
FROM public.ecr.aws/lambda/python:3.11

# Set working directory
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy requirements first (better layer caching)
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir: Don't cache pip downloads (saves space)
# --upgrade: Ensure latest versions
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY *.py .

# Set CMD to your handler
# Format: "filename.function_name"
CMD ["handler.lambda_handler"]

# Optional: Add healthcheck metadata
LABEL maintainer="your-email@example.com"
LABEL description="Corn prediction Lambda with XGBoost"
```

### Advanced Dockerfile (Multi-stage Build)

For even smaller images:

```dockerfile
# Stage 1: Build dependencies
FROM public.ecr.aws/lambda/python:3.11 as builder

WORKDIR /build

COPY requirements.txt .

# Install to a specific directory
RUN pip install --no-cache-dir --target=/build/packages -r requirements.txt

# Stage 2: Runtime image
FROM public.ecr.aws/lambda/python:3.11

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy only the installed packages
COPY --from=builder /build/packages ${LAMBDA_TASK_ROOT}

# Copy application code
COPY *.py .

CMD ["handler.lambda_handler"]
```

---

## Testing & Deployment

### Local Development Workflow

```bash
# 1. Make changes to Python code
vim amplify/functions/commodity-pipelines/corn/handler.py

# 2. Test Docker build locally
cd amplify/functions/commodity-pipelines/corn
docker build -t corn-test .

# 3. Run container locally with test event
echo '{"source": "test"}' | docker run --rm -i \
  -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  corn-test

# 4. Deploy to sandbox
cd ../../../../  # Back to repo root
npx ampx sandbox
```

### Sandbox Deployment

```bash
# Start sandbox with logs
npx ampx sandbox --stream-function-logs

# In another terminal, manually invoke Lambda
aws lambda invoke \
  --function-name CornPredictionPipeline \
  --payload '{"source": "manual-test"}' \
  response.json

# View response
cat response.json
```

### Branch Deployment (CI/CD)

```bash
# Commit changes
git add .
git commit -m "Add Docker Lambda for corn predictions"

# Push to trigger Amplify deployment
git push origin main
```

**Amplify will:**
1. Start CodeBuild with custom Docker image
2. Run `dockerd-entrypoint.sh` to start Docker
3. Execute `npx ampx pipeline-deploy`
4. CDK builds your Docker image
5. Pushes image to ECR
6. Deploys Lambda with container
7. Updates EventBridge schedule

**Monitor deployment:**
- Amplify Console → Your App → main branch → View logs

---

## Troubleshooting

### Issue 1: "Unable to execute 'docker'"

**Symptoms:**
```
[CDKAssetPublishError] CDK failed to publish assets
Unable to execute 'docker' in order to build a container asset
```

**Cause:** Amplify build environment doesn't have Docker

**Solution:**
1. Set custom build image: `public.ecr.aws/codebuild/amazonlinux-x86_64-standard:5.0`
2. Add `dockerd-entrypoint.sh` to `amplify.yml`

### Issue 2: Docker Build Fails Locally

**Symptoms:**
```
Error: Cannot find module 'numpy'
```

**Cause:** Module not in requirements.txt or wrong base image

**Solution:**
1. Verify `requirements.txt` has all dependencies
2. Ensure using AWS Lambda Python base image
3. Check Dockerfile COPY commands

### Issue 3: Lambda Timeout

**Symptoms:**
```
Task timed out after 10.00 seconds
```

**Cause:** Model loading or prediction takes too long

**Solution:**
1. Increase timeout in `backend.ts`:
   ```typescript
   timeout: Duration.minutes(15)
   ```
2. Optimize model loading (cache in /tmp)
3. Increase memory (more CPU allocated):
   ```typescript
   memorySize: 3008  // Max CPU at 1769MB+
   ```

### Issue 4: Permission Denied (S3/DynamoDB)

**Symptoms:**
```
AccessDeniedException: User is not authorized
```

**Cause:** Missing IAM grants in backend.ts

**Solution:**
```typescript
// Grant S3 access
backend.storage.resources.bucket.grantReadWrite(lambdaFunction);

// Grant DynamoDB access
backend.data.resources.tables['TableName'].grantReadWriteData(lambdaFunction);
```

### Issue 5: ECR Image Push Fails

**Symptoms:**
```
Error: Failed to push image to ECR
```

**Cause:** IAM permissions or ECR repository limit

**Solution:**
1. Check IAM has `ecr:*` permissions
2. Verify ECR repository exists (CDK creates automatically)
3. Check AWS account limits (max 10,000 images per repo)

### Issue 6: Large Image Size

**Symptoms:**
```
Image size: 2.5 GB (too large for fast cold starts)
```

**Solution:**
1. Use multi-stage Docker build
2. Remove unnecessary files:
   ```dockerfile
   RUN find /var/task -type f -name '*.pyc' -delete
   RUN find /var/task -type d -name '__pycache__' -delete
   ```
3. Use slim Python packages when available

---

## Best Practices

### 1. Dockerfile Optimization

**Use Layer Caching:**
```dockerfile
# ✅ Good: requirements.txt copied first
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY *.py .

# ❌ Bad: code changes invalidate pip cache
COPY . .
RUN pip install -r requirements.txt
```

**Clean Up Unnecessary Files:**
```dockerfile
RUN pip install --no-cache-dir -r requirements.txt && \
    find /var/task -type d -name '__pycache__' -delete && \
    find /var/task -type f -name '*.pyc' -delete
```

### 2. Environment Variables Management

**Use Parameter Store for Sensitive Data:**
```typescript
import * as ssm from 'aws-cdk-lib/aws-ssm';

const apiKey = ssm.StringParameter.valueForStringParameter(
  customStack,
  '/myapp/api-key'
);

const lambda = new lambda.DockerImageFunction(customStack, 'Function', {
  environment: {
    API_KEY: apiKey  // Securely injected
  }
});
```

### 3. Model Versioning

**Store models in S3 with versions:**
```
s3://my-bucket/
  models/
    corn/
      2025-01-15/
        xgboost_model.pkl
        scaler.pkl
        training_history.json
      latest/  # Symlink or copy
        xgboost_model.pkl
        scaler.pkl
```

**Lambda downloads from `latest/`** but can rollback to specific date if needed.

### 4. Monitoring & Logging

**Add structured logging:**
```python
import json

def log_metric(metric_name, value, unit="None"):
    """CloudWatch custom metric"""
    print(json.dumps({
        "metric": metric_name,
        "value": value,
        "unit": unit,
        "timestamp": datetime.now().isoformat()
    }))

log_metric("PredictionLatency", 1.23, "Seconds")
log_metric("ModelConfidence", 0.85, "Percent")
```

**Set up CloudWatch alarms:**
```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const errorAlarm = new cloudwatch.Alarm(customStack, 'ErrorAlarm', {
  metric: cornPredictionLambda.metricErrors(),
  threshold: 1,
  evaluationPeriods: 1,
  alarmDescription: 'Alert when Lambda fails'
});
```

### 5. Cold Start Optimization

**Use Provisioned Concurrency for critical functions:**
```typescript
const alias = cornPredictionLambda.addAlias('live', {
  provisionedConcurrentExecutions: 1  // Keeps 1 warm instance
});
```

**Or use Lambda SnapStart (Java only) - not applicable for Python**

**For Python: Keep containers warm with scheduled pings**

### 6. Cost Optimization

**Right-size memory allocation:**
- Monitor actual memory usage in CloudWatch
- Lambda CPU scales with memory
- Sweet spot often 1024-2048 MB for ML

**Use Compute Savings Plans:**
- Save up to 17% on Lambda compute
- Good for predictable scheduled workloads

### 7. Security Best Practices

**Least Privilege IAM:**
```typescript
// ✅ Grant specific actions
bucket.grantRead(lambda);

// ❌ Avoid wildcard permissions
// DON'T: lambda.addToRolePolicy(new iam.PolicyStatement({
//   actions: ['s3:*'],
//   resources: ['*']
// }))
```

**Use VPC for sensitive data:**
```typescript
const lambda = new lambda.DockerImageFunction(customStack, 'Function', {
  vpc: vpc,
  vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
  securityGroups: [securityGroup]
});
```

---

## References & Credits

### Essential Reading

1. **Felipe Malaquias - Docker in Amplify Builds** (April 2025)
   - Medium article that solved our CodeBuild Docker issue
   - [Link](https://medium.com/@AlexeyButyrev/using-docker-in-aws-amplify-builds)
   - Without this, we'd have wasted hours debugging!

2. **AWS Official: Container Images with Lambda**
   - [Documentation](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html)
   - Official guide to Lambda container images

3. **AWS Samples: Lambda Docker Serverless Inference**
   - [GitHub](https://github.com/aws-samples/aws-lambda-docker-serverless-inference)
   - Production-ready ML inference patterns

4. **Amplify Gen2: Custom Functions**
   - [Documentation](https://docs.amplify.aws/react/build-a-backend/functions/custom-functions/)
   - How to use CDK escape hatches

### Community Resources

- **GitHub Issue**: [amplify-backend#2386](https://github.com/aws-amplify/amplify-backend/issues/2386) - Docker Lambda discussion
- **AWS re:Post**: [Run Lambda inside Docker](https://repost.aws/questions/QUscIi3YeiTsKMs3Xr9FGhsw) - Community solutions
- **Stack Overflow**: Multiple threads on Lambda size limits and Docker solutions

### Our Implementation

- **Project**: GFY Commodity Prediction Platform
- **Use Case**: XGBoost-based corn/wheat/beans price predictions
- **Stack**: Amplify Gen2, Docker Lambda, EventBridge, DynamoDB, S3
- **Date**: January 2025

---

## Appendix: Quick Reference

### Common Commands

```bash
# Local Docker test
docker build -t my-function .
docker run --rm my-function

# Sandbox
npx ampx sandbox
npx ampx sandbox --stream-function-logs

# Manual Lambda invoke
aws lambda invoke \
  --function-name MyFunction \
  --payload '{}' \
  response.json

# Check ECR images
aws ecr describe-repositories
aws ecr list-images --repository-name amplify-*

# CloudWatch logs
aws logs tail /aws/lambda/MyFunction --follow
```

### Image Size Targets

- **Small**: < 500 MB (fast cold starts, < 2s)
- **Medium**: 500 MB - 1.5 GB (acceptable, 2-5s cold start)
- **Large**: 1.5 GB - 5 GB (slow cold starts, 5-15s)
- **Very Large**: > 5 GB (use provisioned concurrency)

### Lambda Container Limits

- **Max image size**: 10 GB
- **Uncompressed size**: 10 GB
- **Max layers**: N/A (all in container)
- **/tmp storage**: 512 MB (ephemeral)
- **Timeout**: 15 minutes max

---

## Real-World Implementation Lessons

**January 2025 - Lessons from Actual Production Deployment**

After successfully deploying the corn prediction Docker Lambda pipeline, here are critical learnings that weren't in the documentation:

### 1. Docker Runtime: Colima vs Docker Desktop

**Discovery**: You don't need Docker Desktop on macOS! We used **Colima**, a lightweight Docker runtime.

**Why Colima?**
- Free and open-source (no licensing)
- Lightweight (uses minimal resources)
- Works seamlessly with CDK
- Better for CI/CD integration

**Setup:**
```bash
# Install Colima
brew install colima

# Start with 4GB memory (adequate for ML image builds)
colima start --memory 4 --cpu 2

# Verify CDK can detect it
docker ps
# Should work without errors

# CDK automatically uses: ~/.colima/default/docker.sock
```

**Update Prerequisites**: Change "Docker Desktop" to "Docker Desktop OR Colima"

### 2. Path Resolution Gotcha

**The Error We Hit:**
```
Error: Cannot find image directory at:
/Users/.../platform/functions/commodity-pipelines/corn
```

**Root Cause**: Path in `fromImageAsset()` is relative to where `backend.ts` lives, NOT project root!

**Wrong:**
```typescript
code: lambda.DockerImageCode.fromImageAsset('./functions/commodity-pipelines/corn')
```

**Correct:**
```typescript
code: lambda.DockerImageCode.fromImageAsset('./amplify/functions/commodity-pipelines/corn')
// Path relative to backend.ts location (amplify/backend.ts)
```

**Lesson**: Always verify the Dockerfile path with `ls` before deploying!

### 3. Environment Variable Discovery Pattern

**What the docs don't tell you**: DynamoDB table names need manual environment variable injection.

**Standard Amplify Functions (TypeScript)**: Get env vars automatically via `resourceGroupName: 'data'`

**Docker Lambda Functions**: No automatic magic - you must explicitly add them!

**Required Pattern:**
```typescript
// Step 1: Get table reference
const predictionTable = backend.data.resources.tables['CommodityPrediction'];

// Step 2: Grant access
predictionTable.grantReadWriteData(cornPredictionDocker);

// Step 3: CRITICAL - Add table name as environment variable
cornPredictionDocker.addEnvironment('PREDICTION_TABLE', predictionTable.tableName);

// Step 4: Also add Amplify bucket name
cornPredictionDocker.addEnvironment('AMPLIFY_BUCKET', backend.storage.resources.bucket.bucketName);
```

**In your Lambda handler:**
```python
table_name = os.environ.get('PREDICTION_TABLE', 'CommodityPrediction-REPLACE-ME')
# The fallback helps debugging if env var missing
```

### 4. Dual-Write Pattern for Legacy Compatibility

**Real-World Need**: Mobile app expects predictions at legacy S3 path, but Amplify manages its own bucket.

**Solution**: Write to BOTH buckets!

```typescript
// backend.ts - Grant access to BOTH buckets
backend.storage.resources.bucket.grantReadWrite(cornPredictionDocker);

const legacyBucket = s3.Bucket.fromBucketName(
  customFunctionStack,
  'LegacyBucket',
  'gfy-commodity-predictions'
);
legacyBucket.grantReadWrite(cornPredictionDocker);
```

```python
# handler.py - Dual write pattern
# Write 1: Amplify-managed bucket (full details)
amplify_bucket = os.environ.get('AMPLIFY_BUCKET')
s3_client.put_object(
    Bucket=amplify_bucket,
    Key=f"predictions/corn/{now.strftime('%Y-%m-%d')}_corn_prediction.json",
    Body=json.dumps(full_prediction_data)
)

# Write 2: Legacy bucket (mobile app format)
try:
    s3_client.put_object(
        Bucket='gfy-commodity-predictions',
        Key='predictions/latest/corn.json',
        Body=json.dumps(mobile_app_format)
    )
except Exception as e:
    logger.warning(f"Legacy bucket write failed (non-critical): {e}")
```

**Lesson**: Wrap legacy writes in try/except so new pipeline doesn't fail if legacy bucket unavailable.

### 5. EventBridge Staggered Scheduling

**Problem**: Running multiple commodity predictions simultaneously can hit API rate limits.

**Solution**: Stagger EventBridge schedules by 15 minutes!

```typescript
// Corn: 2:00 AM UTC
const cornDailyRule = new events.Rule(customStack, 'CornDailyPrediction', {
  schedule: events.Schedule.cron({ minute: '0', hour: '2', day: '*', month: '*', year: '*' })
});

// Beans: 2:15 AM UTC (15 min later)
const beansDailyRule = new events.Rule(customStack, 'BeansDailyPrediction', {
  schedule: events.Schedule.cron({ minute: '15', hour: '2', day: '*', month: '*', year: '*' })
});

// Wheat: 2:30 AM UTC (30 min later)
const wheatDailyRule = new events.Rule(customStack, 'WheatDailyPrediction', {
  schedule: events.Schedule.cron({ minute: '30', hour: '2', day: '*', month: '*', year: '*' })
});
```

**Real-World Deployment Times (from our logs)**:
- Docker build + ECR push: ~2 minutes
- CloudFormation stack deployment: ~3 minutes
- **Total first deployment: 5.5 minutes** (matches README estimate!)

### 6. GraphQL Manual Trigger Pattern

**Bonus Feature**: Allow users to manually trigger predictions via GraphQL!

```typescript
// amplify/data/resource.ts
const schema = a.schema({
  // Standard models...
  CommodityPrediction: a.model({...}),

  // Manual trigger mutations
  runCornPrediction: a
    .mutation()
    .returns(a.json())
    .authorization((allow) => [allow.publicApiKey()])
    .handler(a.handler.function(cornPredictionPipeline)),
});
```

**Frontend usage:**
```typescript
import { generateClient } from 'aws-amplify/data';
const client = generateClient<Schema>();

// Trigger prediction on-demand
const result = await client.mutations.runCornPrediction();
console.log(result.data);
```

**Lesson**: Docker Lambda functions can be invoked via GraphQL mutations, not just EventBridge!

### 7. Multi-Stack Pattern for Mixed Runtimes

**Architecture Decision**: We have BOTH Docker (Python) and TypeScript Lambda functions.

**Pattern That Works:**
```typescript
// Docker Lambdas in custom stack
const customStack = backend.createStack('custom-ml-functions-stack');
const cornPredictionDocker = new lambda.DockerImageFunction(customStack, ...);

// TypeScript functions stay in data stack (via defineFunction)
export const beansPredictionPipeline = defineFunction({
  name: 'beansPredictionPipeline',
  entry: './functions/commodity-pipelines/beans/handler.ts'
});

const backend = defineBackend({
  data,
  storage,
  beansPredictionPipeline, // TypeScript function
  // Docker function added via CDK escape hatch
});
```

**Why This Matters:**
- TypeScript functions: Compile fast, deploy fast (~30 seconds)
- Docker functions: Build slow, deploy slow (~2-5 minutes)
- Separate stacks allow independent deployment cycles

### 8. Model Path Alignment

**Critical Setup**: Lambda expects EXACT S3 paths!

```python
# handler.py
model_bucket = os.environ.get('MODEL_BUCKET', 'gfy-commodity-predictions')
model_key = 'models/corn/latest/xgboost_model.pkl'
scaler_key = 'models/corn/latest/scaler.pkl'
```

**Verify BEFORE deployment:**
```bash
# Check if models exist at expected paths
aws s3 ls s3://gfy-commodity-predictions/models/corn/latest/

# Should show:
# xgboost_model.pkl
# scaler.pkl
```

**Lesson**: Lambda will fail instantly if model paths don't match. Test S3 paths first!

### 9. Docker Build Caching Behavior

**First Build (Cold):**
- Downloads Python base image: ~1 minute
- Installs pip dependencies: ~2 minutes
- Pushes to ECR: ~2 minutes
- **Total: ~5 minutes**

**Subsequent Builds (Warm):**
- Uses cached layers: ~10 seconds
- Only rebuilds changed layers: ~30 seconds
- **Total: ~40 seconds if only code changed**

**Optimization Tip:**
```dockerfile
# Copy requirements FIRST (changes rarely)
COPY requirements.txt ${LAMBDA_TASK_ROOT}/
RUN pip install -r requirements.txt

# Copy code LAST (changes frequently)
COPY *.py ${LAMBDA_TASK_ROOT}/
```

This ensures pip install layer is cached across code changes!

### 10. Public Access Without Auth (Bonus Learning)

**User Request**: "Make this completely public - no authentication!"

**Complete Auth Removal Process:**

1. **backend.ts**: Remove auth from defineBackend
```typescript
const backend = defineBackend({
  // auth, // REMOVED
  data,
  storage
});
```

2. **data/resource.ts**: Change to public API key
```typescript
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey' // Changed from 'userPool'
  }
});

// All models
CommodityPrediction: a.model({...})
  .authorization((allow) => [allow.publicApiKey()]) // Changed from allow.owner()
```

3. **storage/resource.ts**: Remove guest/authenticated access
```typescript
export const storage = defineStorage({
  name: 'commodityModelStorage',
  access: (allow) => ({
    'commodity-models/*': [
      // REMOVED: allow.authenticated.to(['read']),
      // REMOVED: allow.guest.to(['read']),
      allow.resource(cornPredictionPipeline).to(['read', 'write'])
    ]
  })
});
```

4. **Frontend - AuthProvider.tsx**: Replace with no-op
```typescript
export function AuthProvider({ children }: { children: ReactNode }) {
  const publicUser: User = {
    email: 'guest@public.app',
    name: 'Guest User',
    userId: 'public-guest'
  };

  return (
    <AuthContext.Provider value={{
      user: publicUser,
      isLoading: false,
      isAuthenticated: true, // Always true
      signIn: async () => console.log('Auth disabled'),
      ...
    }}>
      {children}
    </AuthContext.Provider>
  );
}
```

5. **Middleware.ts**: Allow all requests
```typescript
export async function middleware(request: NextRequest) {
  return NextResponse.next(); // No auth checks
}
```

**Lesson**: Removing auth is NOT just commenting out code - requires systematic updates across 5+ files!

### 11. Dev Logger Workflow (MCP Tool Integration)

**Better Than Manual Commands**: We used MCP dev-logger tool for multi-project safety.

**Traditional Workflow (Error-Prone):**
```bash
npx ampx sandbox  # Might conflict with other projects
```

**Better Workflow (Multi-Project Safe):**
```typescript
// MCP tool handles:
// - Process isolation per project directory
// - Automatic log streaming to resources/sandbox/sandbox.log
// - Clean process management (no orphaned sandboxes)
dev_start_sandbox()
dev_tail_sandbox_logs({ lines: 50 })
dev_stop_sandbox()
```

**Lesson**: Custom tooling around Amplify CLI improves developer experience significantly!

---

## Conclusion

Docker Lambda with Amplify Gen2 is the **modern, recommended approach** for ML workloads despite requiring CDK escape hatches. The 10 GB limit removes size constraints, and with proper configuration (Docker daemon in CodeBuild), deployment is reliable.

**Key Takeaways:**
1. ✅ Use Docker Lambda for Python ML dependencies (XGBoost, scikit-learn, etc.)
2. ✅ CDK escape hatch in `backend.ts` is straightforward
3. ✅ **Must** configure custom CodeBuild image + dockerd script
4. ✅ Worth the setup cost for production ML workloads
5. ✅ Lambda Layers only viable for small dependencies

**Thank you to Felipe Malaquias** for documenting the Docker daemon solution - saved us hours of debugging! 🙏

---

*Last Updated: January 2025 - Updated with real-world production deployment lessons*
*Tested with: Amplify Gen2, CDK v2, Python 3.11, XGBoost 2.0*
*Production Deployment: Corn prediction pipeline successfully deployed with Docker Lambda (1.6GB image, 2GB memory, 10min timeout)*
