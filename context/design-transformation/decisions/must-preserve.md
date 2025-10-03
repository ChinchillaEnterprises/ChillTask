# What MUST Be Preserved
## Core Template Functionality That Cannot Break

### 🛡️ Non-Negotiable Elements

#### 1. Component-First Architecture
**MUST PRESERVE**:
- MUI component library as foundation
- No additional UI libraries (no Tailwind, no custom CSS frameworks)
- Component warehouse structure in hidden folders
- All existing MUI imports and patterns

**WHY**: This is the revolutionary speed enabler - AI can build 5-10x faster

#### 2. Rapid Development Speed
**MUST PRESERVE**:
- 1-week web app capability
- 2-week MVP capability
- Fast compilation (minimal pages)
- No build-time overhead

**WHY**: Core value proposition of the template

#### 3. Layout System Architecture
**MUST PRESERVE**:
- `LayoutProvider` functionality
- Authentication page detection
- Automatic navbar/sidebar inclusion
- Current routing patterns
- Folder structure (`src/app/`, `src/components/`)

**WHY**: This smart layout system is what makes adding pages effortless

#### 4. Amplify Integration Points
**MUST PRESERVE**:
- All authentication hooks and components
- `ConfigureAmplify` component
- OAuth redirect handling (Lines 10-20 in page.tsx)
- Hub event listeners
- Current auth flow structure

**WHY**: Template's purpose is Amplify-first development

#### 5. Development Patterns
**MUST PRESERVE**:
- Page creation pattern (Box → Typography → MUI components)
- Sidebar menu addition pattern
- sx prop for styling (not CSS files)
- Current file naming conventions

**WHY**: These patterns enable AI to add features consistently

### ⚠️ Technical Constraints

#### Package Dependencies
**CANNOT CHANGE**:
- MUI version (v5/v6)
- Next.js 15 structure
- AWS Amplify Gen 2 setup
- Current package.json dependencies

**CAN CHANGE**:
- Theme configuration values
- Color schemes
- Typography settings
- Spacing/sizing

#### File Structure
**CANNOT CHANGE**:
- `/src/app/` routing structure
- Component organization
- Provider setup
- Public folder structure

**CAN CHANGE**:
- Component internal styling
- Page content
- Visual elements

### 🎯 Transformation Boundaries

#### What We CAN Transform:
1. **All visual styling**:
   - Colors, gradients, shadows
   - Border radius, spacing
   - Typography styles
   - Animation/transition effects

2. **Content and Messaging**:
   - All text content
   - Button labels
   - Headlines and descriptions
   - Help text and tooltips

3. **Visual Elements**:
   - Icons and emojis
   - Decorative elements
   - Background patterns
   - Card layouts (keeping MUI structure)

#### What We CANNOT Touch:
1. **Core Architecture**:
   - File organization
   - Import patterns
   - Component hierarchy
   - Provider structure

2. **Development Flow**:
   - Page creation method
   - Navigation addition method
   - Component usage patterns
   - Build/compile process

3. **Integration Points**:
   - Amplify configuration
   - Authentication flow
   - API connections
   - State management

### 📋 Pre-Transformation Checklist

Before making ANY change, verify:
- [ ] Change only affects visual styling or content
- [ ] No new dependencies added
- [ ] MUI components still used as base
- [ ] Layout system remains intact
- [ ] Authentication flow unchanged
- [ ] Build time not increased
- [ ] No custom CSS files created
- [ ] sx prop still used for styling

### 🚦 Safe Transformation Examples

✅ **SAFE**: Changing button gradient from purple to earth tones
✅ **SAFE**: Replacing generic "Create Something" with specific action
✅ **SAFE**: Removing glassmorphism effects
✅ **SAFE**: Changing emoji to custom MUI icons

❌ **UNSAFE**: Adding Tailwind for styling
❌ **UNSAFE**: Creating custom CSS modules
❌ **UNSAFE**: Changing MUI to another library
❌ **UNSAFE**: Modifying LayoutProvider logic

### 💡 Remember

The goal is to make this template look authentic and human-centered while maintaining its superpower: the ability to ship production apps in 1-2 weeks. Every design decision must respect this core constraint.