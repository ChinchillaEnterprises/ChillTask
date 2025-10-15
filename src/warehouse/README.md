# 📦 Component Warehouse

## Purpose
This folder contains a **massive library of pre-built MUI components** that are NOT connected to the main application. These components:
- ✅ Are available for AI to discover and use
- ✅ Are NOT compiled during build (excluded in tsconfig.json)
- ✅ Serve as templates for new features
- ❌ Should NOT be directly imported into active pages

## How AI Should Use This

When asked to add a feature, AI should:
1. **Browse the warehouse** to find relevant components
2. **Copy the component** to the active `src/components/` folder
3. **Modify and integrate** the component into the app
4. **Update imports** to match the new location

## Available Components

### 📘 Buttons (`/buttons`)
- Basic buttons
- Icon buttons
- Loading buttons
- Button groups
- Floating action buttons

### 📝 Forms (`/forms`)
- Text fields
- Select dropdowns
- Checkboxes and radios
- Date/time pickers
- File uploaders

### 📊 Charts (`/charts`)
- Line charts
- Bar charts
- Pie charts
- Area charts
- Mixed charts

### 📋 Tables (`/tables`)
- Basic tables
- Data tables
- Sortable tables
- Editable tables

### 🎴 Cards (`/cards`)
- Basic cards
- Media cards
- Interactive cards
- Stats cards

### 💬 Dialogs (`/dialogs`)
- Confirmation dialogs
- Form dialogs
- Full-screen dialogs
- Custom dialogs

## Example Usage

If asked to "add a contact form", AI would:
```bash
# 1. Find form components in warehouse
ls src/warehouse/forms/

# 2. Copy relevant component
cp src/warehouse/forms/ContactForm.tsx src/components/ContactForm.tsx

# 3. Update imports and integrate
# 4. Add to a page
```

## Important Notes

- 🚫 Never import directly from `/warehouse`
- ✅ Always copy to active components first
- 🔧 Modify copied components to fit the app's needs
- 🎨 Maintain consistent styling with existing app

This warehouse is the **hidden arsenal** that makes AI development 5-10x faster!