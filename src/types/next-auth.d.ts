import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

// Without this, the file would be an ambient module declaration that
// shadows the real "next-auth" package instead of augmenting it.
export {};