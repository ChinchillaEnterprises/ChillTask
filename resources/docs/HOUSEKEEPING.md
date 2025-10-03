# 🧹 Daily Repository Housekeeping Guide

*A comprehensive maintenance guide for keeping the transportation-insight repository clean, organized, and professional.*

---

## 🎯 **Quick Start for Ricardo**

**Every morning, simply tell Claude:**
> "Hey Claude, read the housekeeping guide and analyze our repo for any cleanup needed."

Claude will scan for messes and either auto-fix small issues or present a plan for your approval.

---

## 📋 **DAILY HOUSEKEEPING CHECKLIST**

### **Phase 1: Root Directory Scan**
- [ ] Check for new loose files at repository root
- [ ] Identify any scripts (.py, .sh) that appeared overnight
- [ ] Look for backup files (.bak), system files (.DS_Store), or temp files
- [ ] Verify only essential framework files remain at root

### **Phase 2: Context Folder Maintenance**
- [ ] Ensure context root only contains README.md and organized subfolders
- [ ] Check for new documentation files that need proper categorization
- [ ] Verify folder naming conventions remain consistent

### **Phase 3: Resources Organization**
- [ ] Scan for new utilities or scripts that need proper folder assignment
- [ ] Check if Python/Shell scripts are in correct categorized subfolders
- [ ] Ensure documentation is in appropriate thematic folders

---

## 🏗️ **COMPREHENSIVE REPOSITORY ORGANIZATION PROTOCOL**

*Use this section when performing deep cleaning or major reorganization.*

### **PHASE 1: ROOT DIRECTORY CLEANUP**

#### **1.1 File Analysis & Categorization**
- **Scan the entire root directory** for all files (not just folders)
- **Identify file types**: Python scripts (.py), Shell scripts (.sh), text files (.txt), backup files (.bak), system files (.DS_Store), etc.
- **Categorize each file** by purpose:
  - Framework/system required (package.json, tsconfig.json, .env files, etc.)
  - Utility scripts that should be organized
  - Documentation that belongs in subfolders
  - Temporary/backup files that should be deleted
  - Resources that need better organization

#### **1.2 File Organization Strategy**
- **KEEP AT ROOT**: Only essential framework files (package.json, tsconfig.json, middleware.ts, .gitignore, amplify files, etc.)
- **DELETE**: System files (.DS_Store), backup files (.bak), duplicate files, old logs
- **ORGANIZE**: Move supporting materials to `resources/` folder
- **STRUCTURE**: Use deep subfolder hierarchy with clear categorization

#### **1.3 Utilities Folder Structure**
```
resources/utilities/
├── scripts/
│   ├── python/
│   │   ├── slack/              # Slack integration scripts
│   │   ├── databricks/         # Database scripts
│   │   └── [category]/         # Other categorized scripts
│   └── shell/
│       ├── auth/              # Authentication setup scripts
│       ├── sync/              # Synchronization scripts
│       └── deployment/        # Deployment scripts
└── resources/                 # Text files, links, references
```

### **PHASE 2: FOLDER REORGANIZATION**

#### **2.1 Current Folder Analysis**
- **List all directories** at the root level
- **Categorize folders** by necessity:
  - **MUST KEEP AT ROOT**: Framework requirements (.git, .next, node_modules, src, public, styles)
  - **USER-SPECIFIED KEEP**: context, logs (as explicitly requested)
  - **CAN BE REORGANIZED**: Documentation, examples, configurations, legacy code

#### **2.2 Target Root Structure**
```
transportation-insight/
├── .amplify/                  # Amplify framework
├── .git/                      # Git version control
├── .next/                     # Next.js build
├── amplify/                   # Amplify config
├── context/                   # Project context (keep at root)
├── logs/                      # Application logs (keep at root)
├── node_modules/              # NPM dependencies
├── public/                    # Next.js public assets
├── resources/                 # All supporting materials
├── src/                       # Application source code
├── styles/                    # Global styles
├── .env.local                 # Environment config
├── .gitignore                 # Git ignore rules
├── amplify_outputs.json       # Amplify outputs
├── amplify.yml                # Amplify build config
├── middleware.ts              # Next.js middleware
├── next-env.d.ts             # Next.js types
├── package.json              # NPM package config
├── package-lock.json         # NPM lock file
├── README.md                 # Main documentation
├── tsconfig.json             # TypeScript config
└── tsconfig.tsbuildinfo      # TypeScript build info
```

### **PHASE 3: CONTEXT FOLDER ORGANIZATION**

#### **3.1 Context Structure Standards**
```
context/
├── README.md                          # Only file at root level
├── legacy-codebase/                   # Previous platform code
│   ├── page-components/               # UI component references
│   └── source-files/                  # Source code references
├── qa-test-scenarios/                 # Testing scenarios and queries
├── setup-guides/                      # All authentication and setup docs
│   ├── AUTH_SETUP.md
│   ├── GOOGLE_OAUTH_SETUP.md
│   ├── OKTA_SECRETS_SETUP.md
│   └── claude-sync-instructions.md
├── team-communications/               # Slack conversations and team docs
│   └── slack/                         # Organized by date
├── technical-docs/                    # Architecture and technical documentation
│   ├── project-architecture.md
│   ├── deployment-notes.md
│   ├── KNOWN_ISSUES.md
│   └── [other technical docs]
└── ui-specifications/                 # Design specs and UI documentation
    ├── ask-data-page.md
    ├── dashboards-page.md
    └── [other UI specs]
```

#### **3.2 File Organization Rules**
- **NO FILES AT CONTEXT ROOT** except README.md
- **Organize MD files by purpose**:
  - Auth & setup docs → `setup-guides/`
  - Architecture & project docs → `technical-docs/`
  - UI/design specs → `ui-specifications/`
  - Testing scenarios → `qa-test-scenarios/`
- **Delete duplicates** and unnecessary files
- **Clean up system files** (.DS_Store, broken symlinks, old logs)

### **PHASE 4: ADVANCED ORGANIZATION**

#### **4.1 Python Environment Organization**
```
resources/python/
├── databricks/                        # Databricks integration scripts
│   ├── databricks_agent_testing.py
│   ├── databricks_oauth.py
│   └── databricks_query.py
├── environments/                      # Virtual environments
│   └── venv/
├── README.md                          # Python setup documentation
├── requirements.txt                   # Python dependencies
└── [other python utilities]
```

#### **4.2 Script Categorization Standards**
- **Authentication scripts** → `resources/utilities/scripts/shell/auth/`
- **Sync/integration scripts** → `resources/utilities/scripts/shell/sync/`
- **Slack processing scripts** → `resources/utilities/scripts/python/slack/`
- **Database scripts** → `resources/python/databricks/`

---

## 🔧 **EXECUTION GUIDELINES**

### **Planning Phase (ALWAYS FIRST)**
1. **NEVER MOVE FILES IMMEDIATELY**
2. **Analyze current state** and identify issues
3. **Present ASCII folder structure** showing proposed changes
4. **Get user approval** before making any changes
5. **Use TodoWrite tool** to track all tasks and progress

### **Implementation Order**
1. **Delete unnecessary files** first (.DS_Store, .bak files, duplicates)
2. **Create new folder structure** if needed
3. **Move files in logical groups** (not one by one)
4. **Rename folders systematically** following naming conventions
5. **Organize documentation files** into appropriate thematic folders
6. **Verify clean structure** and confirm no files are lost

### **Naming Conventions**
- **Use lowercase with hyphens** for multi-word folders: `team-communications`, `qa-test-scenarios`
- **Be descriptive and professional**: `ui-specifications` not `design`
- **Group by purpose**: `setup-guides` for all auth/config docs
- **Avoid abbreviations**: `legacy-codebase` not `legacy`

---

## 📝 **DAILY MAINTENANCE AUTOMATION**

### **Quick Assessment Command**
When Ricardo starts his day, he should say:
> "Read the housekeeping guide and scan the repo for any organization issues. Fix small problems automatically, or present a plan for bigger issues."

### **Expected Daily Issues**
- New files dumped at root overnight
- Scripts added without proper categorization
- Documentation files in wrong locations
- Backup or temp files that need deletion

### **Auto-Fix Threshold**
**Auto-fix without asking:**
- Moving 1-2 clearly misplaced files
- Deleting obvious temp/backup files
- Basic folder organization

**Ask for approval:**
- Moving multiple files
- Creating new folder structures
- Renaming existing folders
- Deleting files that might be important

---

## 🎯 **SUCCESS CRITERIA**

### **Clean Repository Indicators**
- ✅ **Root directory**: Only essential framework files + context + logs + resources
- ✅ **Context folder**: Only README.md at root, all docs properly categorized
- ✅ **Resources folder**: Deep organization with clear categorization
- ✅ **No loose files**: Everything has a logical, discoverable location
- ✅ **Consistent naming**: Professional, descriptive folder names throughout

### **Developer Experience Goals**
- 🚀 **30-second rule**: Any file findable within 30 seconds
- 🚀 **New code homes**: Clear place for new scripts/docs
- 🚀 **Team onboarding**: New developers can navigate easily
- 🚀 **Maintainable growth**: Structure scales with project complexity

---

## 🔄 **Git Integration**

### **Commit Process**
When changes are made:
1. **Check git status** to review all changes
2. **Stage all changes** with `git add .`
3. **Create descriptive commit** following repository conventions:
   ```
   refactor: Daily housekeeping - reorganize [specific changes]

   • [Bullet point of main changes]
   • [Additional changes if significant]

   🤖 Generated with [Claude Code](https://claude.ai/code)
   Co-Authored-By: Claude <noreply@anthropic.com>
   ```
4. **Push to remote** only when explicitly requested

---

## 📣 **TEAM NOTIFICATION PROTOCOL**

### **Academy Channel Updates**
After completing housekeeping tasks, Claude should automatically send a brief notification to the Academy Slack channel:

**Required Steps:**
1. **Use Slack MCP server** to access Academy channel
2. **Send concise update message** (2 sentences max)
3. **Include repository name** for clarity

**Example Notification:**
```
🧹 Daily housekeeping completed for transportation-insight repository! Organized loose files, cleaned up context folder, and maintained proper folder structure for optimal development workflow.
```

**Implementation:**
- Use `mcp__slack__slack_send_message` tool
- Channel: Academy (get channel ID via `mcp__slack__slack_list_channels`)
- Message should be professional and informative
- Include emoji for visual clarity (🧹 or 📁)

---

*This guide ensures the transportation-insight repository remains clean, professional, and maintainable for the entire development team.*