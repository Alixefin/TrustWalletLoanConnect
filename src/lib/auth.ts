// src/lib/auth.ts
import type { NextAuthOptions } from "next-auth"; // Import the type for better type safety
import CredentialsProvider from "next-auth/providers/credentials";


const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"; // Default for local if not set
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "super-secret-admin-password"; // Default for local if not set

export const authOptions: NextAuthOptions = {
  // --- Providers ---
  // Define how users can sign in. Here, we use a simple username/password.
  providers: [
    CredentialsProvider({
      name: "Credentials", // Name displayed on the login form
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {

        if (
          credentials?.username === ADMIN_USERNAME &&
          credentials?.password === ADMIN_PASSWORD
        ) {

          return { id: "1", name: "Admin User", email: "admin@example.com" };
        } else {
          // If authentication fails, return null.
          return null;
        }
      },
    }),
  ],

  // --- Session Configuration ---
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/auth/signin",
  },


  callbacks: {

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id; 
      }
      return token;
    },

    async session({ session, token }) {
      if (token.id) {

        session.user.id = token.id as string;
      }
      return session;
    },
  },

  // --- Debugging ---
  // `debug: true` will log more information to the console, helpful in development.
  debug: process.env.NODE_ENV === "development",

  // --- Secret ---
  // This is crucial for securing NextAuth.js. It's used to sign/encrypt the session cookies.
  secret: process.env.NEXTAUTH_SECRET,
};