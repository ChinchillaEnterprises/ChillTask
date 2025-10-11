"use client";

import { useState, useEffect, useCallback } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

/**
 * 🎯 Real-World Amplify Gen 2 Usage Examples
 * 
 * This file shows complete, production-ready patterns combining
 * queries, mutations, and subscriptions in real React components.
 * 
 * ⚠️ IMPORTANT: Examples 2 and 3 use models (Post, Profile) and custom operations
 * (getUserStats) that are NOT in the default schema. To use these examples:
 * 
 * 1. Copy the models you need from amplify/examples/data/simple-custom-operations.ts
 * 2. Add them to your amplify/data/resource.ts
 * 3. Create the Lambda function for getUserStats (see amplify/examples/functions/graphqlResolver)
 * 4. Update your amplify/backend.ts to include the Lambda function
 * 
 * Example 1 (RealtimeTodoList) works out of the box with the default schema!
 */

// =============================================================================
// EXAMPLE 1: Todo List with Real-time Updates
// =============================================================================

export function RealtimeTodoList() {
  const [todos, setTodos] = useState<Schema["Todo"]["type"][]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoContent, setNewTodoContent] = useState("");

  // Load initial todos
  useEffect(() => {
    async function loadTodos() {
      try {
        const { data, errors } = await client.models.Todo.list();
        if (errors) {
          console.error("Failed to load todos:", errors);
        } else {
          setTodos(data);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadTodos();
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to new todos
    const createSub = client.models.Todo.onCreate().subscribe({
      next: (newTodo) => {
        setTodos(prev => [...prev, newTodo]);
      },
      error: (error) => console.error("Create subscription error:", error),
    });

    // Subscribe to todo updates
    const updateSub = client.models.Todo.onUpdate().subscribe({
      next: (updatedTodo) => {
        setTodos(prev => 
          prev.map(todo => 
            todo.id === updatedTodo.id ? updatedTodo : todo
          )
        );
      },
      error: (error) => console.error("Update subscription error:", error),
    });

    // Subscribe to todo deletes
    const deleteSub = client.models.Todo.onDelete().subscribe({
      next: (deletedTodo) => {
        setTodos(prev => prev.filter(todo => todo.id !== deletedTodo.id));
      },
      error: (error) => console.error("Delete subscription error:", error),
    });

    // Cleanup subscriptions
    return () => {
      createSub.unsubscribe();
      updateSub.unsubscribe();
      deleteSub.unsubscribe();
    };
  }, []);

  // Create todo handler
  const handleCreateTodo = async () => {
    if (!newTodoContent.trim()) return;

    try {
      const { errors } = await client.models.Todo.create({
        content: newTodoContent,
      });

      if (errors) {
        console.error("Failed to create todo:", errors);
        alert("Failed to create todo");
      } else {
        setNewTodoContent("");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  // Delete todo handler
  const handleDeleteTodo = async (todoId: string) => {
    try {
      const { errors } = await client.models.Todo.delete({ id: todoId });
      
      if (errors) {
        console.error("Failed to delete todo:", errors);
        alert("Failed to delete todo");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  // Update todo handler
  const handleUpdateTodo = async (todoId: string, newContent: string) => {
    try {
      const { errors } = await client.models.Todo.update({
        id: todoId,
        content: newContent,
      });
      
      if (errors) {
        console.error("Failed to update todo:", errors);
        alert("Failed to update todo");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  if (loading) {
    return <div>Loading todos...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Real-time Todo List</h2>
      
      {/* Create new todo */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newTodoContent}
          onChange={(e) => setNewTodoContent(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleCreateTodo()}
          placeholder="Add a new todo..."
          className="flex-1 px-3 py-2 border rounded"
        />
        <button
          onClick={handleCreateTodo}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Todo
        </button>
      </div>

      {/* Todo list */}
      <ul className="space-y-2">
        {todos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center justify-between p-3 bg-gray-100 rounded"
          >
            <span
              onClick={() => {
                const newContent = prompt("Edit todo:", todo.content || "");
                if (newContent !== null && newContent !== todo.content) {
                  handleUpdateTodo(todo.id, newContent);
                }
              }}
              className="flex-1 cursor-pointer hover:text-blue-600"
            >
              {todo.content}
            </span>
            <button
              onClick={() => handleDeleteTodo(todo.id)}
              className="text-red-500 hover:text-red-700"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && (
        <p className="text-gray-500 text-center mt-4">No todos yet. Create one!</p>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 2: Blog with Posts and Profiles
// =============================================================================

export function BlogFeed() {
  const [posts, setPosts] = useState<Schema["Post"]["type"][]>([]);
  const [profiles, setProfiles] = useState<Map<string, Schema["Profile"]["type"]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published'>('published');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Load posts based on filter
        const postFilter = filter === 'published' 
          ? { published: { eq: true } }
          : undefined;

        const { data: postData, errors: postErrors } = await client.models.Post.list({
          filter: postFilter,
        });

        if (postErrors) {
          console.error("Failed to load posts:", postErrors);
        } else {
          setPosts(postData);

          // Load profiles for all authors
          const authorIds = [...new Set(postData.map(p => p.authorId))];
          const profilePromises = authorIds.map(id => 
            client.models.Profile.list({
              filter: { userId: { eq: id } },
              limit: 1,
            })
          );

          const profileResults = await Promise.all(profilePromises);
          const profileMap = new Map<string, Schema["Profile"]["type"]>();
          
          profileResults.forEach((result, index) => {
            if (!result.errors && result.data[0]) {
              profileMap.set(authorIds[index], result.data[0]);
            }
          });

          setProfiles(profileMap);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [filter]);

  // Set up subscriptions for real-time updates
  useEffect(() => {
    const subscriptions: Array<() => void> = [];

    // Subscribe to new posts
    const createSub = client.models.Post.onCreate({
      filter: filter === 'published' 
        ? { published: { eq: true } }
        : undefined,
    }).subscribe({
      next: (newPost) => {
        setPosts(prev => [newPost, ...prev]);
        
        // Load profile for new post author if not cached
        if (!profiles.has(newPost.authorId)) {
          loadAuthorProfile(newPost.authorId);
        }
      },
    });
    subscriptions.push(() => createSub.unsubscribe());

    // Subscribe to post updates
    const updateSub = client.models.Post.onUpdate().subscribe({
      next: (updatedPost) => {
        setPosts(prev => 
          prev.map(post => 
            post.id === updatedPost.id ? updatedPost : post
          )
        );
      },
    });
    subscriptions.push(() => updateSub.unsubscribe());

    // Subscribe to post deletes
    const deleteSub = client.models.Post.onDelete().subscribe({
      next: (deletedPost) => {
        setPosts(prev => prev.filter(post => post.id !== deletedPost.id));
      },
    });
    subscriptions.push(() => deleteSub.unsubscribe());

    // Subscribe to profile updates
    const profileSub = client.models.Profile.onUpdate().subscribe({
      next: (updatedProfile) => {
        setProfiles(prev => {
          const newMap = new Map(prev);
          newMap.set(updatedProfile.userId, updatedProfile);
          return newMap;
        });
      },
    });
    subscriptions.push(() => profileSub.unsubscribe());

    // Cleanup
    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [filter, profiles]);

  // Load author profile helper
  const loadAuthorProfile = async (authorId: string) => {
    try {
      const { data, errors } = await client.models.Profile.list({
        filter: { userId: { eq: authorId } },
        limit: 1,
      });

      if (!errors && data[0]) {
        setProfiles(prev => {
          const newMap = new Map(prev);
          newMap.set(authorId, data[0]);
          return newMap;
        });
      }
    } catch (error) {
      console.error("Failed to load profile:", error);
    }
  };

  // Create new post
  const handleCreatePost = async () => {
    const title = prompt("Post title:");
    const content = prompt("Post content:");
    
    if (!title || !content) return;

    try {
      const { errors } = await client.models.Post.create({
        title,
        content,
        authorId: "current-user-id", // In real app, get from Auth
        published: false,
      });

      if (errors) {
        console.error("Failed to create post:", errors);
        alert("Failed to create post");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  // Toggle post published status
  const handleTogglePublished = async (post: Schema["Post"]["type"]) => {
    try {
      const { errors } = await client.models.Post.update({
        id: post.id,
        published: !post.published,
      });

      if (errors) {
        console.error("Failed to toggle published:", errors);
        alert("Failed to update post");
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An error occurred");
    }
  };

  if (loading) {
    return <div>Loading blog feed...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold mb-6">Blog Feed</h2>

      {/* Controls */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={handleCreatePost}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Create Post
        </button>
        
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as 'all' | 'published')}
          className="px-4 py-2 border rounded"
        >
          <option value="published">Published Only</option>
          <option value="all">All Posts</option>
        </select>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => {
          const author = profiles.get(post.authorId);
          
          return (
            <article
              key={post.id}
              className="bg-white p-6 rounded-lg shadow-lg"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{post.title}</h3>
                  <p className="text-gray-600 text-sm">
                    By {author?.displayName || 'Unknown Author'}
                    {post.createdAt && (
                      <> • {new Date(post.createdAt).toLocaleDateString()}</>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => handleTogglePublished(post)}
                  className={`px-3 py-1 rounded text-sm ${
                    post.published 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {post.published ? 'Published' : 'Draft'}
                </button>
              </div>
              
              <p className="text-gray-700">{post.content}</p>
              
              {author?.bio && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600 italic">
                    About the author: {author.bio}
                  </p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      {posts.length === 0 && (
        <p className="text-gray-500 text-center mt-8">
          No posts yet. Create one to get started!
        </p>
      )}
    </div>
  );
}

// =============================================================================
// EXAMPLE 3: User Dashboard with Custom Query
// =============================================================================

export function UserDashboard({ userId }: { userId: string }) {
  const [stats, setStats] = useState<Schema["UserStats"]["type"] | null>(null);
  const [recentPosts, setRecentPosts] = useState<Schema["Post"]["type"][]>([]);
  const [profile, setProfile] = useState<Schema["Profile"]["type"] | null>(null);
  const [loading, setLoading] = useState(true);

  // Load dashboard data
  useEffect(() => {
    async function loadDashboard() {
      try {
        // Run all queries in parallel
        const [statsResult, postsResult, profileResult] = await Promise.all([
          // Custom query for user stats
          client.queries.getUserStats({
            userId,
            includeActivity: true,
          }),
          
          // Get user's recent posts
          client.models.Post.list({
            filter: { authorId: { eq: userId } },
            limit: 5,
          }),
          
          // Get user profile
          client.models.Profile.list({
            filter: { userId: { eq: userId } },
            limit: 1,
          }),
        ]);

        // Handle stats
        if (statsResult.errors) {
          console.error("Failed to load stats:", statsResult.errors);
        } else {
          setStats(statsResult.data);
        }

        // Handle posts
        if (postsResult.errors) {
          console.error("Failed to load posts:", postsResult.errors);
        } else {
          setRecentPosts(postsResult.data);
        }

        // Handle profile
        if (profileResult.errors) {
          console.error("Failed to load profile:", profileResult.errors);
        } else if (profileResult.data[0]) {
          setProfile(profileResult.data[0]);
        }
      } catch (error) {
        console.error("Dashboard load error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [userId]);

  // Subscribe to real-time updates
  useEffect(() => {
    const subscriptions: Array<() => void> = [];

    // Subscribe to new posts by this user
    const postSub = client.models.Post.onCreate({
      filter: { authorId: { eq: userId } },
    }).subscribe({
      next: (newPost) => {
        setRecentPosts(prev => [newPost, ...prev].slice(0, 5));
        
        // Update stats (in real app, you'd refetch or update locally)
        setStats(prev => prev ? {
          ...prev,
          totalPosts: prev.totalPosts + 1,
          lastActive: new Date().toISOString(),
        } : null);
      },
    });
    subscriptions.push(() => postSub.unsubscribe());

    // Subscribe to profile updates
    const profileSub = client.models.Profile.onUpdate({
      filter: { userId: { eq: userId } },
    }).subscribe({
      next: (updatedProfile) => {
        setProfile(updatedProfile);
      },
    });
    subscriptions.push(() => profileSub.unsubscribe());

    return () => {
      subscriptions.forEach(unsub => unsub());
    };
  }, [userId]);

  if (loading) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">User Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Stats Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Stats</h2>
          {stats ? (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Level:</span>{' '}
                <span className="text-blue-600">{stats.level}</span>
              </p>
              <p>
                <span className="font-medium">Total Posts:</span>{' '}
                {stats.totalPosts}
              </p>
              <p>
                <span className="font-medium">Member Since:</span>{' '}
                {stats.joinedDate 
                  ? new Date(stats.joinedDate).toLocaleDateString()
                  : 'Unknown'}
              </p>
              {stats.activity?.latestPost && (
                <p className="text-sm text-gray-600 mt-2">
                  Latest: "{stats.activity.latestPost}"
                </p>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No stats available</p>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Profile</h2>
          {profile ? (
            <div className="space-y-2">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {profile.displayName || 'Not set'}
              </p>
              <p className="text-sm text-gray-600">
                {profile.bio || 'No bio yet'}
              </p>
              <button
                onClick={() => {
                  const newBio = prompt("Update bio:", profile.bio || "");
                  if (newBio !== null && newBio !== profile.bio) {
                    client.models.Profile.update({
                      id: profile.id,
                      bio: newBio,
                    });
                  }
                }}
                className="mt-2 text-blue-500 hover:text-blue-700 text-sm"
              >
                Edit Bio
              </button>
            </div>
          ) : (
            <div>
              <p className="text-gray-500 mb-2">No profile yet</p>
              <button
                onClick={async () => {
                  const displayName = prompt("Your display name:");
                  if (displayName) {
                    await client.models.Profile.create({
                      userId,
                      displayName,
                      joinedDate: new Date().toISOString(),
                    });
                  }
                }}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                Create Profile
              </button>
            </div>
          )}
        </div>

        {/* Recent Posts Card */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Posts</h2>
          {recentPosts.length > 0 ? (
            <ul className="space-y-2">
              {recentPosts.map((post) => (
                <li key={post.id} className="text-sm">
                  <span className="font-medium">{post.title}</span>
                  <span className={`ml-2 text-xs ${
                    post.published ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {post.published ? '✓ Published' : '⏸ Draft'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No posts yet</p>
          )}
        </div>
      </div>
    </div>
  );
}