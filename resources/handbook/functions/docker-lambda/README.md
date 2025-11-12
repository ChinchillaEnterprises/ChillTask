# Docker Lambda Functions with AWS Amplify Gen2

**Complete Guide to Deploying Custom Runtime Lambda Functions**

*Last Updated: January 2025*

---

## Quick Start: Pick Your Language

- **[Python Guide](./PYTHON.md)** - For ML/Data workloads with large dependencies
- **[TypeScript/Node.js Guide](./TYPESCRIPT.md)** - For custom binaries like yt-dlp, FFmpeg, etc.

---

## When to Use Docker Lambda

### Use Docker Lambda When:
✅ Your deployment package exceeds 250MB uncompressed
✅ You need custom system binaries (yt-dlp, FFmpeg, Chromium, etc.)
✅ You need specific OS packages not available in Lambda runtime
✅ You're deploying ML models with heavy dependencies

### Use Regular Lambda (Zip) When:
✅ Your code + dependencies < 250MB
✅ You only need npm/pip packages
✅ You want faster cold starts
✅ You don't need custom system binaries

---

## Architecture Decision: ARM64 vs AMD64

### 🍎 **If You Have Apple Silicon (M1/M2/M3 Mac):**

**Use ARM64 Lambda** - It's native to your Mac!

**Why?**
- ✅ No cross-compilation needed
- ✅ Build on your Mac, deploy to ARM64 Lambda
- ✅ Faster builds (no emulation)
- ✅ **20-34% cheaper** than AMD64 Lambda
- ✅ Same or better performance (AWS Graviton2)

**How?**
```typescript
// In backend.ts
architecture: lambda.Architecture.ARM_64
```

```dockerfile
# In Dockerfile - use default (auto-detects ARM64)
FROM public.ecr.aws/lambda/nodejs:20
```

### 💻 **If You Have Intel Mac or Linux AMD64:**

**Use AMD64 Lambda** - It's native to your machine!

**How?**
```typescript
// In backend.ts
architecture: lambda.Architecture.X86_64  // Default
```

```dockerfile
# In Dockerfile
FROM public.ecr.aws/lambda/nodejs:20  # Auto-detects AMD64
```

---

## Common Issues & Solutions

### ❌ `Runtime.InvalidEntrypoint` / `ProcessSpawnFailed`

**Symptom:** Lambda function fails with this error even though it works locally

**Root Cause:** Architecture mismatch between your build machine and Lambda

**Solution:**
1. Check your Mac architecture: `uname -m`
   - `arm64` → Use ARM64 Lambda
   - `x86_64` → Use AMD64 Lambda

2. Update your `backend.ts`:
```typescript
architecture: lambda.Architecture.ARM_64  // For Apple Silicon
```

3. Remove any `--platform` flags from Dockerfile:
```dockerfile
# ❌ WRONG (forces cross-compilation)
FROM --platform=linux/amd64 public.ecr.aws/lambda/nodejs:20

# ✅ CORRECT (uses native architecture)
FROM public.ecr.aws/lambda/nodejs:20
```

**Why This Works:**
- AWS Lambda supports both ARM64 (Graviton2) and AMD64
- Building natively (ARM64 Mac → ARM64 Lambda) avoids cross-compilation
- Node.js, Python, and most interpreted languages work on both architectures

---

## Performance & Cost Comparison

| Architecture | Cost | Performance | Build Speed on M1 Mac |
|-------------|------|-------------|---------------------|
| ARM64 (Graviton2) | **20-34% cheaper** | Same or better | ✅ Native (fast) |
| AMD64 (x86) | Standard | Standard | ❌ Requires cross-compilation (slow) |

**Recommendation:** Use ARM64 unless you have a specific reason to use AMD64

---

## Language-Specific Guides

### Python
- **Best for:** ML models, data processing, scientific computing
- **Example use cases:** XGBoost, TensorFlow, Pandas
- **See:** [PYTHON.md](./PYTHON.md)

### TypeScript/Node.js
- **Best for:** Custom system binaries, media processing
- **Example use cases:** yt-dlp, FFmpeg, Puppeteer
- **See:** [TYPESCRIPT.md](./TYPESCRIPT.md)

---

## Key Concepts

### Docker Lambda vs Regular Lambda

**Docker Lambda:**
- Container image deployment (up to 10GB)
- Custom OS packages via Dockerfile
- Full control over environment

**Regular Lambda (Zip):**
- Zip file deployment (max 250MB uncompressed)
- Limited to runtime-provided packages
- Simpler, faster cold starts

### Amplify Gen2 and Docker Lambda

Amplify Gen2 **does not** provide a native `defineFunction()` abstraction for Docker Lambda. You must use CDK escape hatches:

```typescript
import * as lambda from 'aws-cdk-lib/aws-lambda';

const dockerFunction = new lambda.DockerImageFunction(stack, 'MyFunction', {
  code: lambda.DockerImageCode.fromImageAsset('./my-function'),
  architecture: lambda.Architecture.ARM_64  // ← Choose architecture
});
```

---

## Next Steps

1. **Choose your language guide** above
2. **Follow the step-by-step implementation**
3. **Deploy and test**

Have questions? Check the language-specific guides for detailed troubleshooting!
