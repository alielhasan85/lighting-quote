// types/next-auth.d.ts
// The fields auth.ts adds to the session. The User fields mirror columns in prisma/schema.prisma.
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: { id: string; role: 'USER' | 'ADMIN'; isActive: boolean } & DefaultSession['user'];
  }

  interface User {
    role?: string;
    isActive?: boolean;
  }
}
