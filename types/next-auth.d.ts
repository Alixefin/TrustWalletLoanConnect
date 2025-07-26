// next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth"; // Import DefaultSession and DefaultUser
import { JWT } from "next-auth/jwt"; // Import JWT

// Extend the NextAuth module types
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context.
   * We are extending the `Session` interface to include our custom `id` on `session.user`.
   */
  interface Session {
    user: {
      id: string; // Add the custom 'id' property to session.user
    } & DefaultSession["user"]; // Keep the default properties (name, email, image)
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   * We are extending the `User` interface as well.
   */
  interface User extends DefaultUser {
    id: string; // Ensure the User object also has an 'id' property
  }
}

// Extend the NextAuth JWT module types
declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, when using JWT sessions.
   * We are extending the `JWT` interface to include our custom `id`.
   */
  interface JWT {
    id: string; // Add the custom 'id' property to the JWT token
  }
}