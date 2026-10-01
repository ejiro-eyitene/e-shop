import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    // Without this, Auth.js renders its own error page and a failed sign-in
    // looks like an unexplained redirect/404.
    error: "/auth/error",
  },
  providers: [
    // Left unconfigured on purpose: Auth.js v5 infers AUTH_GOOGLE_ID and
    // AUTH_GOOGLE_SECRET from the provider id. Passing clientId: undefined
    // explicitly would override that inference and break the OAuth URL.
    Google,
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user && user.id) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});