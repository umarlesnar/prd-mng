import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db';
import { UserAccount } from '@/models/UserAccount';
import { StoreUser } from '@/models/StoreUser';
import { comparePassword } from '@/lib/auth';
import '@/models/Store';

declare module 'next-auth' {
  interface User {
    accountType?: string;
    storeId?: string;
    storeUserId?: string;
    needsStore?: boolean;
  }
  interface Session {
    user: {
      accountType?: string;
      storeId?: string;
      storeUserId?: string;
      needsStore?: boolean;
    };
  }
}

export const { handlers: { GET, POST } } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        store_id: { label: 'Store ID', type: 'text', required: false },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const emailLower = String(credentials.email).toLowerCase();
        const password = String(credentials.password);

        // Try user_account first
        const userAccount = await UserAccount.findOne({ email: emailLower });
        
        if (userAccount) {
          const isValid = await comparePassword(password, userAccount.password_hash);
          if (!isValid) {
            return null;
          }

          const storeIdParam = credentials.store_id ? String(credentials.store_id) : undefined;
          const storeUser = await StoreUser.findOne({ 
            user_account_id: userAccount._id,
            ...(storeIdParam ? { store_id: storeIdParam } : {})
          }).populate('store_id');

          if (!storeUser) {
            return {
              id: userAccount._id.toString(),
              email: userAccount.email,
              name: userAccount.full_name,
              accountType: 'user_account',
              needsStore: true,
            };
          }

          const storeId = typeof storeUser.store_id === 'object' && storeUser.store_id?._id
            ? storeUser.store_id._id.toString()
            : storeUser.store_id.toString();

          return {
            id: userAccount._id.toString(),
            email: userAccount.email,
            name: userAccount.full_name,
            accountType: 'user_account',
            storeId,
            storeUserId: storeUser._id.toString(),
          };
        }

        // Try store_user
        const query: any = { email: emailLower };
        if (credentials.store_id) {
          query.store_id = String(credentials.store_id);
        }

        const storeUser = await StoreUser.findOne(query).populate('store_id');
        
        if (!storeUser) {
          return null;
        }

        const isValid = await comparePassword(password, storeUser.password_hash);
        if (!isValid) {
          return null;
        }

        const storeId = typeof storeUser.store_id === 'object' && storeUser.store_id?._id
          ? storeUser.store_id._id.toString()
          : storeUser.store_id.toString();

        return {
          id: `store_user_${storeUser._id.toString()}`,
          email: storeUser.email,
          name: storeUser.full_name,
          accountType: 'store_user',
          storeId,
          storeUserId: storeUser._id.toString(),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.accountType = user.accountType;
        token.storeId = user.storeId;
        token.storeUserId = user.storeUserId;
        token.needsStore = user.needsStore;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.accountType = token.accountType as string;
        session.user.storeId = token.storeId as string;
        session.user.storeUserId = token.storeUserId as string;
        session.user.needsStore = token.needsStore as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET || 'your-secret-key-change-in-production',
});

