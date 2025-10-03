import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, isAuthenticated } from '@/utils/server-auth';

/**
 * Protected API Route Example
 * GET /api/protected/user - Returns current user info
 */
export async function GET(request: NextRequest) {
  // Check authentication
  const authenticated = await isAuthenticated();
  
  if (!authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  // Get user details
  const user = await getServerUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  
  // Return user data (you can filter sensitive info here)
  return NextResponse.json({
    userId: user.userId,
    email: user.email,
    name: user.name,
    // Don't return all attributes for security
    // attributes: user.attributes
  });
}

/**
 * Protected API Route Example
 * POST /api/protected/user - Update user profile
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const user = await getServerUser();
  
  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  try {
    const body = await request.json();
    
    // Here you would update user profile in your database
    // Example: await updateUserProfile(user.userId, body);
    
    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      userId: user.userId
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}