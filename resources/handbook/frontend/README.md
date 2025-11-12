# 🎨 Frontend / Client-Side Guide

**Complete guide to building production-ready UIs with AWS Amplify Gen 2 + Next.js + React.**

---

## 🎯 Quick Navigation

| I Need To... | Go Here |
|--------------|---------|
| **Fix TypeScript import errors from Amplify** | [PATH_ALIASES.md](./PATH_ALIASES.md) ⭐ |
| **Implement glassmorphism / liquid glass design** | [design/LIQUID_GLASS_DESIGN.md](#-design-system) |
| **Set up authentication flows** | [Auth Flows](#1-auth-flowstsx---authentication-examples) |
| **Create/update/delete data** | [Mutations](#2-mutationstsx---all-write-operations) |
| **Fetch and filter data** | [Queries](#3-queriestsx---all-read-operations) |
| **Add real-time features** | [Subscriptions](#4-subscriptionstsx---real-time-features) |
| **See complete examples** | [Real-world Usage](#5-real-world-usagetsx---complete-examples) |

---

## 🎨 Design System

### [design/LIQUID_GLASS_DESIGN.md](./design/LIQUID_GLASS_DESIGN.md) ⭐ **NEW**

**Complete guide to the Industrial Tron + Liquid Glass aesthetic.**

**What's inside:**
- 🧊 **Liquid Glass technique** - Apple-style glassmorphism with backdrop blur
- ⚡ **Tron-style glowing accents** - Yellow glow effects on buttons and elements
- 🎨 **Beon color palette** - Black, Yellow, Cloud, Teal unified brand colors
- 🔬 **Physics-aided design** - Why white borders create the glass illusion
- 📐 **MUI theme implementation** - Complete theme.ts configuration
- 🌈 **Radial gradients** - Multi-layer backgrounds for glass visibility
- 🔤 **Oswald typography** - Industrial/futuristic font setup
- 📱 **Responsive patterns** - Mobile-first gradient and font sizing
- ⚡ **Performance tips** - GPU optimization for backdrop filters
- 🎯 **Real-world examples** - Sign-in page, dashboard, glowing bubbles

**Key Concepts:**
```css
/* The Secret Sauce */
background: rgba(255, 255, 255, 0.15);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.3);  /* WHITE border - critical! */
```

**Why it matters:**
- Creates Apple-level polish and depth
- Differentiates your app from generic Material UI
- Provides modern, professional aesthetic
- Works across all major browsers (with prefixes)

**TL;DR:** Use white borders (not black) at low opacity on glass elements. Layer multiple radial gradients for backdrop visibility. Yellow glows need double shadows (directional + omnidirectional).

---

## 📚 What's Included

### 1. **auth-flows.tsx** - Authentication Examples
- Sign up, sign in, sign out flows
- Email confirmation and verification
- Password reset and management
- Social authentication (Google, Facebook, etc.)
- Multi-factor authentication (MFA)
- User profile management
- Session handling
- Error handling for all auth scenarios

### 2. **mutations.tsx** - All Write Operations
- Creating records (single and batch)
- Updating records (partial and conditional)
- Deleting records (hard and soft delete)
- Error handling patterns
- Optimistic updates
- Validation examples

### 3. **queries.tsx** - All Read Operations
- Basic queries (get by ID, list all)
- Filtered queries (single and multiple conditions)
- Pagination patterns
- Sorting approaches
- Custom queries (like `getUserStats`)
- Performance optimization
- Real-time queries with `observeQuery`

### 4. **subscriptions.tsx** - Real-time Features
- Basic subscriptions (onCreate, onUpdate, onDelete)
- Filtered subscriptions
- React hooks for subscriptions
- Collaborative features
- Error recovery patterns
- Connection handling

### 5. **real-world-usage.tsx** - Complete Examples
- Real-time Todo List component
- Blog Feed with posts and profiles
- User Dashboard with custom queries
- Combines queries, mutations, and subscriptions

## 🚀 Quick Start

### Basic Query Example
```typescript
// Get a single todo
const { data, errors } = await client.models.Todo.get({ id: todoId });

// List all todos
const { data, errors } = await client.models.Todo.list();

// Filter todos
const { data, errors } = await client.models.Todo.list({
  filter: {
    content: {
      contains: "Amplify"
    }
  }
});
```

### Basic Mutation Example
```typescript
// Create a todo
const { data, errors } = await client.models.Todo.create({
  content: "Learn Amplify"
});

// Update a todo
const { data, errors } = await client.models.Todo.update({
  id: todoId,
  content: "Learn Amplify Gen 2"
});

// Delete a todo
const { data, errors } = await client.models.Todo.delete({
  id: todoId
});
```

### Basic Subscription Example
```typescript
// Subscribe to new todos
const subscription = client.models.Todo.onCreate().subscribe({
  next: (newTodo) => {
    console.log("New todo created:", newTodo);
  },
  error: (error) => {
    console.error("Subscription error:", error);
  }
});

// Don't forget to unsubscribe!
subscription.unsubscribe();
```

## 🎯 Custom Operations

The template includes a custom query example (`getUserStats`) that shows how to extend beyond basic CRUD:

```typescript
// Call custom query
const { data, errors } = await client.queries.getUserStats({
  userId: "user123",
  includeActivity: true
});
```

To add more custom operations, update your `amplify/data/resource.ts`:

```typescript
// Custom mutation example
processUserAction: a
  .mutation()
  .arguments({
    userId: a.string().required(),
    action: a.string().required(),
  })
  .returns(a.customType({
    success: a.boolean().required(),
    message: a.string(),
  }))
  .handler(a.handler.function(processUserActionFunction))
  .authorization((allow) => [allow.authenticated()]),
```

## 💡 Best Practices

### 1. **Always Handle Errors**
```typescript
const { data, errors } = await client.models.Todo.create({ content });

if (errors) {
  console.error("Failed to create:", errors);
  // Show user-friendly error message
  return;
}

// Success - use data
```

### 2. **Clean Up Subscriptions**
```typescript
useEffect(() => {
  const subscription = client.models.Todo.onCreate().subscribe({
    next: (data) => { /* handle */ }
  });

  // Always return cleanup function
  return () => subscription.unsubscribe();
}, []);
```

### 3. **Use Optimistic Updates for Better UX**
```typescript
// Update UI immediately
setTodos(prev => [...prev, tempTodo]);

// Then sync with server
const { data, errors } = await client.models.Todo.create({ content });

if (errors) {
  // Revert optimistic update on error
  setTodos(prev => prev.filter(t => t.id !== tempTodo.id));
}
```

### 4. **Batch Operations for Performance**
```typescript
// Run multiple queries in parallel
const [todos, posts, profile] = await Promise.all([
  client.models.Todo.list(),
  client.models.Post.list(),
  client.models.Profile.get({ id: profileId })
]);
```

## 🔐 Authorization Patterns

The template shows different authorization strategies:

- **Owner-based**: `allow.owner()` - Users can only access their own data
- **Authenticated**: `allow.authenticated()` - Any signed-in user
- **Public**: `allow.publicApiKey()` - For server/webhook access
- **Groups**: `allow.groups(['admin'])` - Role-based access

## 📱 Real-time Collaboration

See `subscriptions.tsx` for patterns like:
- Live document editing
- Activity feeds
- User presence
- Chat applications

## 🎨 UI Integration

The examples show how to integrate with React state:

```typescript
const [todos, setTodos] = useState<Schema["Todo"]["type"][]>([]);

// Load initial data
useEffect(() => {
  const loadTodos = async () => {
    const { data } = await client.models.Todo.list();
    setTodos(data);
  };
  loadTodos();
}, []);

// Keep in sync with subscriptions
useEffect(() => {
  const sub = client.models.Todo.onCreate().subscribe({
    next: (newTodo) => setTodos(prev => [...prev, newTodo])
  });
  return () => sub.unsubscribe();
}, []);
```

## 🚦 Next Steps

1. **Copy the patterns you need** from these examples
2. **Modify the schema** in `amplify/data/resource.ts` for your use case
3. **Add custom operations** for complex business logic
4. **Set up proper error handling** and loading states
5. **Implement authentication** with Amplify Auth

## 📖 Resources

- [Amplify Gen 2 Docs](https://docs.amplify.aws/gen2)
- [Data Modeling Guide](https://docs.amplify.aws/gen2/build-a-backend/data/)
- [Real-time Data](https://docs.amplify.aws/gen2/build-a-backend/data/subscribe-data/)
- [Custom Business Logic](https://docs.amplify.aws/gen2/build-a-backend/data/custom-business-logic/)

## ⚠️ Important Notes

- These are **client-side** examples for use in your React components
- For **server-side** operations, see the Lambda function examples
- Always validate user input before sending to the backend
- Use environment-specific configuration for production