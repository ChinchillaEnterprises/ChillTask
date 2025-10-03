"use client";

import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../amplify/data/resource";

const client = generateClient<Schema>();

/**
 * 🎯 Amplify Gen 2 Query Examples
 * 
 * This file demonstrates all the ways to query data in AWS Amplify Gen 2
 * including basic queries, filtering, pagination, relationships, and custom queries.
 * 
 * ⚠️ NOTE: Many examples use Post and Profile models that aren't in the default schema.
 * See amplify/examples/data/ for these model definitions.
 * The Todo examples work with the default schema!
 */

// =============================================================================
// BASIC QUERIES
// =============================================================================

/**
 * Get Single Item by ID
 */
export async function getTodoById(todoId: string) {
  try {
    const { data, errors } = await client.models.Todo.get({ id: todoId });
    
    if (errors) {
      console.error("Get todo failed:", errors);
      return null;
    }
    
    if (!data) {
      console.log("Todo not found");
      return null;
    }
    
    console.log("Found todo:", data);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * List All Items
 */
export async function listAllTodos() {
  try {
    const { data, errors } = await client.models.Todo.list();
    
    if (errors) {
      console.error("List todos failed:", errors);
      return [];
    }
    
    console.log(`Found ${data.length} todos`);
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

/**
 * List with Limit
 */
export async function listRecentPosts(limit: number = 10) {
  try {
    const { data, errors } = await client.models.Post.list({
      limit,
    });
    
    if (errors) {
      console.error("List posts failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

// =============================================================================
// FILTERED QUERIES
// =============================================================================

/**
 * Filter by Field Value - Exact Match
 */
export async function getPublishedPosts() {
  try {
    const { data, errors } = await client.models.Post.list({
      filter: {
        published: {
          eq: true, // Equal to true
        },
      },
    });
    
    if (errors) {
      console.error("Get published posts failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

/**
 * Filter by Author
 */
export async function getPostsByAuthor(authorId: string) {
  try {
    const { data, errors } = await client.models.Post.list({
      filter: {
        authorId: {
          eq: authorId,
        },
      },
    });
    
    if (errors) {
      console.error("Get posts by author failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

/**
 * Complex Filter - Multiple Conditions
 */
export async function getRecentPublishedPosts(daysAgo: number = 7) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
    
    const { data, errors } = await client.models.Post.list({
      filter: {
        and: [
          {
            published: {
              eq: true,
            },
          },
          {
            createdAt: {
              gt: cutoffDate.toISOString(), // Greater than
            },
          },
        ],
      },
    });
    
    if (errors) {
      console.error("Get recent published posts failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

/**
 * String Filtering - Contains, Begins With
 */
export async function searchTodos(searchTerm: string) {
  try {
    const { data, errors } = await client.models.Todo.list({
      filter: {
        content: {
          contains: searchTerm, // Case-sensitive contains
          // beginsWith: searchTerm, // Alternative: starts with
          // notContains: searchTerm, // Alternative: doesn't contain
        },
      },
    });
    
    if (errors) {
      console.error("Search todos failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

/**
 * OR Filter - Match Any Condition
 */
export async function getTodosWithKeywords(keywords: string[]) {
  try {
    const { data, errors } = await client.models.Todo.list({
      filter: {
        or: keywords.map(keyword => ({
          content: {
            contains: keyword,
          },
        })),
      },
    });
    
    if (errors) {
      console.error("Get todos with keywords failed:", errors);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

// =============================================================================
// PAGINATION
// =============================================================================

/**
 * Basic Pagination
 */
export async function getPaginatedPosts(limit: number = 10, nextToken?: string) {
  try {
    const { data, errors, nextToken: newNextToken } = await client.models.Post.list({
      limit,
      nextToken, // Pass token from previous query
    });
    
    if (errors) {
      console.error("Get paginated posts failed:", errors);
      return { posts: [], nextToken: null };
    }
    
    return {
      posts: data,
      nextToken: newNextToken, // Use for next page
      hasMore: !!newNextToken,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return { posts: [], nextToken: null };
  }
}

/**
 * Load More Pattern - Common UI pattern
 */
export async function loadMoreTodos(
  existingTodos: Schema["Todo"]["type"][],
  pageSize: number = 20,
  nextToken?: string
) {
  try {
    const { data, errors, nextToken: newNextToken } = await client.models.Todo.list({
      limit: pageSize,
      nextToken,
    });
    
    if (errors) {
      console.error("Load more todos failed:", errors);
      return {
        todos: existingTodos,
        nextToken: null,
        hasMore: false,
      };
    }
    
    return {
      todos: [...existingTodos, ...data],
      nextToken: newNextToken,
      hasMore: !!newNextToken,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      todos: existingTodos,
      nextToken: null,
      hasMore: false,
    };
  }
}

// =============================================================================
// SORTING (Note: Requires @index in your schema)
// =============================================================================

/**
 * Sort by Created Date
 * Note: This requires adding an index to your schema:
 * @index(name: "byCreatedAt", sortKeyFields: ["createdAt"])
 */
export async function getPostsSortedByDate() {
  try {
    const { data, errors } = await client.models.Post.list({
      // If you have an index, you can use it:
      // indexName: "byCreatedAt",
      // Or sort client-side:
    });
    
    if (errors) {
      console.error("Get sorted posts failed:", errors);
      return [];
    }
    
    // Client-side sort as fallback
    return data.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateB - dateA; // Newest first
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}

// =============================================================================
// CUSTOM QUERIES
// =============================================================================

/**
 * Call Custom Query - getUserStats
 * This is defined in your schema as a custom operation
 */
export async function getUserStatsExample(userId: string, includeActivity: boolean = true) {
  try {
    const { data, errors } = await client.queries.getUserStats({
      userId,
      includeActivity,
    });
    
    if (errors) {
      console.error("Get user stats failed:", errors);
      return null;
    }
    
    console.log("User stats:", data);
    console.log(`User ${data.userId} is level ${data.level}`);
    console.log(`Total posts: ${data.totalPosts}`);
    
    if (data.activity) {
      console.log("Latest post:", data.activity.latestPost);
    }
    
    return data;
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

/**
 * Custom Query with Error Handling
 */
export async function getUserStatsWithFallback(userId: string) {
  try {
    const { data, errors } = await client.queries.getUserStats({
      userId,
      includeActivity: true,
    });
    
    if (errors) {
      // Return default stats on error
      return {
        userId,
        totalPosts: 0,
        level: "beginner",
        lastActive: null,
        joinedDate: null,
        activity: null,
      };
    }
    
    return data;
  } catch (error) {
    console.error("Failed to get user stats:", error);
    // Return default stats on error
    return {
      userId,
      totalPosts: 0,
      level: "beginner",
      lastActive: null,
      joinedDate: null,
      activity: null,
    };
  }
}

// =============================================================================
// RELATIONSHIPS (if you add them to your schema)
// =============================================================================

/**
 * Query with Related Data
 * Note: This requires defining relationships in your schema
 */
export async function getPostWithAuthorProfile(postId: string) {
  try {
    const { data: post, errors: postErrors } = await client.models.Post.get({ id: postId });
    
    if (postErrors || !post) {
      console.error("Get post failed:", postErrors);
      return null;
    }
    
    // Manually fetch related data (until relationships are added)
    const { data: profile, errors: profileErrors } = await client.models.Profile.list({
      filter: {
        userId: {
          eq: post.authorId,
        },
      },
      limit: 1,
    });
    
    if (profileErrors) {
      console.error("Get profile failed:", profileErrors);
    }
    
    return {
      post,
      authorProfile: profile?.[0] || null,
    };
  } catch (error) {
    console.error("Unexpected error:", error);
    return null;
  }
}

// =============================================================================
// REAL-TIME QUERIES (ObserveQuery)
// =============================================================================

/**
 * Real-time Query - Auto-updates when data changes
 */
export function observeTodos(
  onUpdate: (todos: Schema["Todo"]["type"][]) => void,
  onError?: (error: any) => void
) {
  const subscription = client.models.Todo.observeQuery().subscribe({
    next: (data) => {
      console.log("Todos updated:", data.items.length);
      onUpdate(data.items);
    },
    error: (error) => {
      console.error("Observe error:", error);
      onError?.(error);
    },
  });
  
  // Return unsubscribe function
  return () => subscription.unsubscribe();
}

/**
 * Real-time Filtered Query
 */
export function observeUserPosts(
  authorId: string,
  onUpdate: (posts: Schema["Post"]["type"][]) => void
) {
  const subscription = client.models.Post.observeQuery({
    filter: {
      authorId: {
        eq: authorId,
      },
    },
  }).subscribe({
    next: (data) => {
      console.log(`User's posts updated: ${data.items.length} posts`);
      onUpdate(data.items);
    },
    error: (error) => {
      console.error("Observe error:", error);
    },
  });
  
  return () => subscription.unsubscribe();
}

// =============================================================================
// PERFORMANCE PATTERNS
// =============================================================================

/**
 * Batch Queries - Fetch multiple resources efficiently
 */
export async function getDashboardData(userId: string) {
  try {
    // Run queries in parallel for better performance
    const [todos, posts, profile, stats] = await Promise.all([
      // Get user's todos
      client.models.Todo.list({ limit: 5 }),
      
      // Get user's recent posts
      client.models.Post.list({
        filter: { authorId: { eq: userId } },
        limit: 10,
      }),
      
      // Get user profile
      client.models.Profile.list({
        filter: { userId: { eq: userId } },
        limit: 1,
      }),
      
      // Get user stats
      client.queries.getUserStats({ userId, includeActivity: true }),
    ]);
    
    return {
      todos: todos.data || [],
      posts: posts.data || [],
      profile: profile.data?.[0] || null,
      stats: stats.data || null,
      errors: [
        ...(todos.errors || []),
        ...(posts.errors || []),
        ...(profile.errors || []),
        ...(stats.errors || []),
      ],
    };
  } catch (error) {
    console.error("Dashboard data fetch error:", error);
    return {
      todos: [],
      posts: [],
      profile: null,
      stats: null,
      errors: [error],
    };
  }
}

/**
 * Query with Field Selection (if supported)
 * Note: Currently Amplify Gen 2 doesn't support field selection,
 * but this pattern shows how to minimize data transfer
 */
export async function getPostTitles() {
  try {
    const { data, errors } = await client.models.Post.list({
      // In future versions, you might be able to:
      // select: ["id", "title"],
    });
    
    if (errors) {
      console.error("Get post titles failed:", errors);
      return [];
    }
    
    // For now, map to only needed fields client-side
    return data.map(post => ({
      id: post.id,
      title: post.title,
    }));
  } catch (error) {
    console.error("Unexpected error:", error);
    return [];
  }
}