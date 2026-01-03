import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, getUserIdFromToken } from './auth';
import { connectDB } from './db';
import { StoreUser } from '@/models/StoreUser';
import { UserAccount } from '@/models/UserAccount';
import { Store } from '@/models/Store';
// Import Store model to ensure schema is registered before populate
import '@/models/Store';

export interface AuthContext {
  userId: string;
  accountType: 'user_account' | 'store_user';
  storeId?: string;
  storeUser?: any;
  userAccount?: any;
}

/**
 * Extracts and validates JWT token from request
 */
export function getAuthToken(req: NextRequest): string | null {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Gets authenticated user ID from request
 * Returns the raw ID (may be prefixed with "store_user_" for store users)
 */
export function getAuthenticatedUserId(req: NextRequest): string {
  const token = getAuthToken(req);
  if (!token) {
    throw new Error('Missing authorization token');
  }
  try {
    return getUserIdFromToken(token);
  } catch (error: any) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Gets authenticated user context (handles both user_accounts and store_users)
 */
export async function getAuthenticatedUser(req: NextRequest): Promise<AuthContext> {
  const token = getAuthToken(req);
  if (!token) {
    throw new Error('Missing authorization token');
  }
  
  try {
    const userId = getUserIdFromToken(token);
    
    // Check if it's a store_user token (prefixed with "store_user_")
    if (userId.startsWith('store_user_')) {
      const storeUserId = userId.replace('store_user_', '');
      await connectDB();
      // Ensure 'stores' model is registered (via import above) before populate
      const storeUser = await StoreUser.findById(storeUserId).populate('store_id');
      
      if (!storeUser) {
        throw new Error('Store user not found');
      }
      
      // Ensure store_id is always a string
      const storeId = typeof storeUser.store_id === 'object' && storeUser.store_id?._id
        ? (typeof storeUser.store_id._id === 'string' ? storeUser.store_id._id : String(storeUser.store_id._id))
        : (typeof storeUser.store_id === 'string' ? storeUser.store_id : String(storeUser.store_id));
      
      return {
        userId: storeUserId,
        accountType: 'store_user',
        storeId,
        storeUser,
      };
    } else {
      // It's a user_account token
      await connectDB();
      const userAccount = await UserAccount.findById(userId);
      
      if (!userAccount) {
        throw new Error('User account not found');
      }
      
      // Try to find their store user (if they have a store)
      // Get the current store from query params or use the first one
      const { searchParams } = new URL(req.url);
      const storeIdParam = searchParams.get('storeId') || searchParams.get('store_id');
      
      let storeUser;
      if (storeIdParam) {
        storeUser = await StoreUser.findOne({ 
          user_account_id: userId,
          store_id: storeIdParam 
        }).populate('store_id');
      } else {
        storeUser = await StoreUser.findOne({ user_account_id: userId }).populate('store_id');
      }
      
      // Ensure storeId is always a string if present
      let storeId: string | undefined = undefined;
      if (storeUser?.store_id) {
        if (typeof storeUser.store_id === 'object' && storeUser.store_id?._id) {
          storeId = typeof storeUser.store_id._id === 'string' 
            ? storeUser.store_id._id 
            : String(storeUser.store_id._id);
        } else {
          storeId = typeof storeUser.store_id === 'string' 
            ? storeUser.store_id 
            : String(storeUser.store_id);
        }
      } else if (storeIdParam) {
        storeId = storeIdParam;
      }
      
      return {
        userId,
        accountType: 'user_account',
        userAccount,
        storeUser: storeUser || undefined,
        storeId,
      };
    }
  } catch (error: any) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Gets the store ID from authenticated user (works for both account types)
 */
export async function getAuthenticatedStoreId(req: NextRequest): Promise<string> {
  const authContext = await getAuthenticatedUser(req);
  
  // For user_accounts without a storeUser, try to get their first store
  if (!authContext.storeId && authContext.accountType === 'user_account') {
    await connectDB();
    const store = await Store.findOne({ owner_user_id: authContext.userId });
    if (store) {
      return typeof store._id === 'string' ? store._id : store._id.toString();
    }
  }
  
  if (!authContext.storeId) {
    throw new Error('No store access available');
  }
  // Ensure storeId is always returned as a string
  return typeof authContext.storeId === 'string' 
    ? authContext.storeId 
    : String(authContext.storeId);
}

/**
 * Middleware helper to authenticate requests
 */
export async function authenticateRequest(req: NextRequest): Promise<AuthContext> {
  const token = getAuthToken(req);
  if (!token) {
    throw new Error('Missing authorization');
  }

  const userId = getUserIdFromToken(token);
  return { 
    userId, 
    accountType: userId.startsWith('store_user_') ? 'store_user' : 'user_account',
    storeId: undefined,
  };
}

/**
 * Middleware helper to authenticate requests and get store context
 */
export async function authenticateStoreRequest(req: NextRequest, storeId?: string): Promise<AuthContext> {
  const authContext = await authenticateRequest(req);
  
  if (storeId) {
    await connectDB();
    const storeUser = await StoreUser.findOne({
      store_id: storeId,
      user_id: authContext.userId,
    }).populate('store_id').populate('user_id');
    
    if (!storeUser) {
      throw new Error('User does not have access to this store');
    }
    
    return {
      ...authContext,
      storeId,
      storeUser,
    };
  }
  
  return authContext;
}

/**
 * Checks if a store user has a specific permission
 */
export function hasPermission(storeUser: any, permission: string): boolean {
  if (!storeUser) return false;
  
  // Admin has all permissions
  if (storeUser.role === 'admin') return true;
  
  // Check if 'all' permission is granted
  if (storeUser.permissions?.includes('all')) return true;
  
  // Check specific permission
  return storeUser.permissions?.includes(permission) || false;
}

/**
 * Checks if a store user is admin
 */
export function isAdmin(storeUser: any): boolean {
  return storeUser?.role === 'admin';
}