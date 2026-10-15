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
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
        token.orgName = user.orgName;
        token.orgPlan = user.orgPlan;
        token.role = user.role;
        return token;
      }

      // Refresh org/role/plan on every session read. These values were frozen at
      // sign-in, so role changes, plan upgrades and Stripe webhooks otherwise
      // had no effect until the user logged out and back in.
      if (token.id) {
        try {
          const membership = await db.membership.findFirst({
            where: { userId: token.id as string },
            include: { organization: true },
            orderBy: { joinedAt: 'asc' },
          });
          if (membership) {
            token.orgId = membership.orgId;
            token.orgSlug = membership.organization.slug;
            token.orgName = membership.organization.name;
            token.orgPlan = membership.organization.plan;
            token.role = membership.role;
          }
        } catch (error) {
          console.error('Failed to refresh session claims:', error);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.orgId = token.orgId;
        session.user.orgSlug = token.orgSlug;
        session.user.orgName = token.orgName;
        session.user.orgPlan = token.orgPlan;
        session.user.role = token.role;
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