# Fixing @parcel/watcher Build Error on AWS Amplify

## The Problem

When deploying an Amplify Gen 2 app to AWS, you may encounter this error:

```
Error: No prebuild or local build of @parcel/watcher found.
Tried @parcel/watcher-linux-x64-glibc.
Please ensure it is installed (don't use --no-optional when installing with npm).
```

This error occurs during the `npx ampx pipeline-deploy` command in your AWS Amplify build.

## Why This Happens

The `@parcel/watcher` package includes **platform-specific optional dependencies**:
- On **macOS**, it installs `@parcel/watcher-darwin-x64`
- On **Linux**, it installs `@parcel/watcher-linux-x64-glibc`

When you run `npm install` on your Mac:
1. It generates a `package-lock.json` that includes the macOS-specific binaries
2. AWS Amplify's Linux build servers try to use that same lockfile
3. The Linux-specific binary is missing, causing the build to fail

## The Solution (3 Steps)

### Step 1: Delete `node_modules` and `package-lock.json`

This forces npm to regenerate the lockfile with **all platform-specific binaries**.

```bash
rm -rf node_modules package-lock.json
```

**What this does:**
- `rm -rf` = Remove recursively and forcefully (no confirmation prompts)
- Deletes the entire `node_modules` folder
- Deletes the `package-lock.json` file

### Step 2: Reinstall Dependencies

Run a fresh install to generate a new lockfile that includes binaries for **all platforms**:

```bash
npm install
```

**What this does:**
- Reads `package.json` and installs all dependencies
- Generates a **new** `package-lock.json` with platform-specific binaries for both macOS and Linux
- The new lockfile will include `@parcel/watcher-linux-x64-glibc` that AWS Amplify needs

### Step 3: Update `amplify.yml` Build Configuration

Change `npm ci` to `npm install` in your `amplify.yml` file to ensure optional dependencies are installed correctly.

**Find and replace these two locations:**

#### Location 1: Backend Build Phase (around line 29)

**Before:**
```yaml
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
```

**After:**
```yaml
backend:
  phases:
    build:
      commands:
        - npm install --cache .npm --prefer-offline
```

#### Location 2: Frontend PreBuild Phase (around line 53)

**Before:**
```yaml
frontend:
  phases:
    preBuild:
      commands:
        - npm ci --cache .npm --prefer-offline
```

**After:**
```yaml
frontend:
  phases:
    preBuild:
      commands:
        - npm install --cache .npm --prefer-offline
```

### Step 4: Commit and Push

```bash
git add package-lock.json amplify.yml
git commit -m "fix: Regenerate package-lock.json for Linux builds and update amplify.yml"
git push origin dev
```

## Why `npm install` Instead of `npm ci`?

| Command | Behavior | Use Case |
|---------|----------|----------|
| `npm ci` | Uses exact lockfile, **doesn't resolve optional dependencies across platforms** | Good for CI/CD when lockfile is already correct |
| `npm install` | Reads lockfile but **resolves all platform-specific binaries** | Better for cross-platform builds (macOS dev → Linux production) |

In our case, `npm install` ensures that when AWS Amplify's Linux servers read the `package-lock.json` (created on macOS), they still get the Linux-specific `@parcel/watcher` binary.

## Verification

After pushing your changes, check the AWS Amplify build logs. You should see:
1. ✅ Dependencies installing without errors
2. ✅ `npx ampx pipeline-deploy` completing successfully
3. ✅ No `@parcel/watcher` errors

## Additional Context

- **Official AWS Documentation:** [Troubleshoot "Cannot find module $amplify/env"](https://docs.amplify.aws/react/build-a-backend/troubleshooting/cannot-find-module-amplify-env/)
- **Related GitHub Issue:** [aws-amplify/amplify-backend#1360](https://github.com/aws-amplify/amplify-backend/issues/1360)
- This is a known issue with npm's handling of optional dependencies across different operating systems

## Quick Reference: Full Command Sequence

```bash
# 1. Delete old dependencies
rm -rf node_modules package-lock.json

# 2. Fresh install
npm install

# 3. Edit amplify.yml (change npm ci → npm install in 2 places)

# 4. Commit and push
git add package-lock.json amplify.yml
git commit -m "fix: Regenerate package-lock.json for Linux builds"
git push origin dev
```

---

**Last Updated:** 2025-10-16
**Related Files:** `package-lock.json`, `amplify.yml`
**Affected Platforms:** AWS Amplify Gen 2 deployments on Linux build servers
