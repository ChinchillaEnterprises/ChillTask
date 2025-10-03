# Connect Amplify Data to Frontend

**Step-by-step pattern for wiring Amplify Data Client to React components**

---

## ✅ Prerequisites

- Amplify Data model exists in `amplify/data/resource.ts`
- `amplify_outputs.json` exists in project root
- Amplify sandbox is running

---

## 📋 Step 1: Imports & Setup

Add these imports at the top of your component file:

```typescript
"use client";

import * as React from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import outputs from "../../../amplify_outputs.json";

// Configure Amplify (do this BEFORE generating client)
Amplify.configure(outputs, { ssr: true });

// Generate the typed client
const client = generateClient<Schema>();
```

**Key Points:**
- ✅ Must be a `"use client"` component
- ✅ Configure Amplify BEFORE generating client
- ✅ Use relative path to `amplify_outputs.json` (adjust `../` as needed)
- ✅ Client is typed with your schema

---

## 📋 Step 2: State Setup

Set up your component state with proper TypeScript types:

```typescript
export default function YourComponent() {
  // Replace "YourModel" with your actual model name (e.g., "ChannelMapping", "Todo", "Product")
  const [items, setItems] = React.useState<Schema["YourModel"]["type"][]>([]);
  const [loading, setLoading] = React.useState(true);

  // ... rest of component
}
```

**Replace `YourModel` with your actual model name!**

---

## 📋 Step 3: Load Initial Data

Add this useEffect to load data when component mounts:

```typescript
// Load initial data
React.useEffect(() => {
  async function loadData() {
    try {
      const { data, errors } = await client.models.YourModel.list();

      if (errors) {
        console.error("Failed to load data:", errors);
      } else {
        setItems(data);
      }
    } catch (error) {
      console.error("Unexpected error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  loadData();
}, []);
```

**Replace `YourModel` with your model name!**

---

## 📋 Step 4: Real-Time Subscriptions

Add this useEffect to set up real-time updates:

```typescript
// Set up real-time subscriptions
React.useEffect(() => {
  // Subscribe to new items
  const createSub = client.models.YourModel.onCreate().subscribe({
    next: (newItem) => {
      setItems(prev => [...prev, newItem]);
    },
    error: (error) => console.error("Create subscription error:", error),
  });

  // Subscribe to item updates
  const updateSub = client.models.YourModel.onUpdate().subscribe({
    next: (updatedItem) => {
      setItems(prev =>
        prev.map(item =>
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    },
    error: (error) => console.error("Update subscription error:", error),
  });

  // Subscribe to item deletes
  const deleteSub = client.models.YourModel.onDelete().subscribe({
    next: (deletedItem) => {
      setItems(prev => prev.filter(item => item.id !== deletedItem.id));
    },
    error: (error) => console.error("Delete subscription error:", error),
  });

  // CRITICAL: Cleanup subscriptions on unmount
  return () => {
    createSub.unsubscribe();
    updateSub.unsubscribe();
    deleteSub.unsubscribe();
  };
}, []);
```

**Key Points:**
- ✅ Three separate subscriptions: onCreate, onUpdate, onDelete
- ✅ MUST cleanup subscriptions in return function (prevents memory leaks!)
- ✅ Replace `YourModel` with your model name

---

## 📋 Step 5: CRUD Operations

### Create
```typescript
const handleCreate = async (formData: any) => {
  try {
    const { errors } = await client.models.YourModel.create({
      // your fields here
      field1: formData.field1,
      field2: formData.field2,
    });

    if (errors) {
      console.error("Failed to create:", errors);
      alert("Failed to create item");
      return;
    }

    // Success - subscription will update UI automatically!
  } catch (error) {
    console.error("Unexpected error:", error);
    alert("An error occurred");
  }
};
```

### Update
```typescript
const handleUpdate = async (id: string, updates: any) => {
  try {
    const { errors } = await client.models.YourModel.update({
      id,
      ...updates,
    });

    if (errors) {
      console.error("Failed to update:", errors);
      alert("Failed to update item");
      return;
    }

    // Success - subscription will update UI automatically!
  } catch (error) {
    console.error("Unexpected error:", error);
    alert("An error occurred");
  }
};
```

### Delete
```typescript
const handleDelete = async (id: string) => {
  try {
    const { errors } = await client.models.YourModel.delete({ id });

    if (errors) {
      console.error("Failed to delete:", errors);
      alert("Failed to delete item");
      return;
    }

    // Success - subscription will update UI automatically!
  } catch (error) {
    console.error("Unexpected error:", error);
    alert("An error occurred");
  }
};
```

**Key Points:**
- ✅ Always check for `errors` in the response
- ✅ Always wrap in try-catch
- ✅ Provide user feedback (alerts, toasts, etc.)
- ✅ UI updates automatically via subscriptions (no manual state updates needed!)

---

## 📋 Step 6: Loading State UI

Show loading state while data loads:

```typescript
if (loading) {
  return (
    <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
      <CircularProgress size={60} />
    </Box>
  );
}
```

---

## 📋 Step 7: Render Your Data

```typescript
return (
  <div>
    {items.map((item) => (
      <div key={item.id}>
        {/* Render your item */}
        <p>{item.someField}</p>
        <button onClick={() => handleUpdate(item.id, { someField: 'new value' })}>
          Update
        </button>
        <button onClick={() => handleDelete(item.id)}>
          Delete
        </button>
      </div>
    ))}
  </div>
);
```

---

## 🎯 Complete Working Example

Here's how all the pieces fit together:

```typescript
"use client";

import * as React from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import outputs from "../../../amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });
const client = generateClient<Schema>();

export default function YourComponent() {
  const [items, setItems] = React.useState<Schema["YourModel"]["type"][]>([]);
  const [loading, setLoading] = React.useState(true);

  // Step 1: Load initial data
  React.useEffect(() => {
    async function loadData() {
      try {
        const { data, errors } = await client.models.YourModel.list();
        if (errors) {
          console.error("Failed to load:", errors);
        } else {
          setItems(data);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Step 2: Set up subscriptions
  React.useEffect(() => {
    const createSub = client.models.YourModel.onCreate().subscribe({
      next: (newItem) => setItems(prev => [...prev, newItem]),
    });

    const updateSub = client.models.YourModel.onUpdate().subscribe({
      next: (updatedItem) => setItems(prev =>
        prev.map(item => item.id === updatedItem.id ? updatedItem : item)
      ),
    });

    const deleteSub = client.models.YourModel.onDelete().subscribe({
      next: (deletedItem) => setItems(prev =>
        prev.filter(item => item.id !== deletedItem.id)
      ),
    });

    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  // Step 3: CRUD handlers
  const handleCreate = async (data: any) => {
    const { errors } = await client.models.YourModel.create(data);
    if (errors) console.error("Create failed:", errors);
  };

  const handleUpdate = async (id: string, updates: any) => {
    const { errors } = await client.models.YourModel.update({ id, ...updates });
    if (errors) console.error("Update failed:", errors);
  };

  const handleDelete = async (id: string) => {
    const { errors } = await client.models.YourModel.delete({ id });
    if (errors) console.error("Delete failed:", errors);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          {/* Your UI here */}
        </div>
      ))}
    </div>
  );
}
```

---

## ⚠️ Common Pitfalls

1. **Forgetting to unsubscribe** → Memory leaks! Always return cleanup function
2. **Wrong path to amplify_outputs.json** → Check your relative path (`../`)
3. **Not checking for errors** → Always check `if (errors)` in responses
4. **Configuring Amplify after generating client** → Configure FIRST, then generate client
5. **Forgetting "use client"** → This must be a client component

---

## ✅ Checklist

Before moving on, verify:
- [ ] Amplify configured before client generation
- [ ] State uses proper TypeScript types (`Schema["YourModel"]["type"]`)
- [ ] Initial data loading useEffect in place
- [ ] All three subscriptions set up (create, update, delete)
- [ ] Subscriptions have cleanup (return function)
- [ ] CRUD operations check for errors
- [ ] Loading state shown to user
- [ ] Model name replaced everywhere (no "YourModel" left!)

---

**You're done! Your frontend is now connected to Amplify Data with real-time updates! 🎉**
