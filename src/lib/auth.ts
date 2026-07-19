import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          include: {
            memberships: {
              include: { organization: true },
            },
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordValid) {
          return null;
        }

        // Get the first organization membership
        const membership = user.memberships[0];

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          // Custom fields passed through
          orgId: membership?.organization?.id,
          orgSlug: membership?.organization?.slug,
          orgName: membership?.organization?.name,
          orgPlan: membership?.organization?.plan,
          role: membership?.role || 'analyst',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.orgId = (user as Record<string, unknown>).orgId;
        token.orgSlug = (user as Record<string, unknown>).orgSlug;
        token.orgName = (user as Record<string, unknown>).orgName;
        token.orgPlan = (user as Record<string, unknown>).orgPlan;
        token.role = (user as Record<string, unknown>).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = token.id;
        (session.user as Record<string, unknown>).orgId = token.orgId;
        (session.user as Record<string, unknown>).orgSlug = token.orgSlug;
        (session.user as Record<string, unknown>).orgName = token.orgName;
        (session.user as Record<string, unknown>).orgPlan = token.orgPlan;
        (session.user as Record<string, unknown>).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
    error: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'leadfinder-ai-dev-secret-change-in-production',
};