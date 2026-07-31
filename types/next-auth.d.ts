import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      orgId: string;
      orgSlug?: string;
      orgName?: string;
      orgPlan: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    orgId: string;
    orgSlug?: string;
    orgName?: string;
    orgPlan: string;
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    orgId: string;
    orgSlug?: string;
    orgName?: string;
    orgPlan: string;
    role: string;
  }
}
