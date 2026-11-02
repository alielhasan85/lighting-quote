// app/api/auth/[...nextauth]/route.ts
// Auth.js routes: the sign-in page, provider callbacks and sign-out. Config: auth.ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
