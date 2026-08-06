import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "usuario@iec.pucminas.br" },
        password: { label: "Senha", type: "password" }
      },
      async authorize(credentials, req) {
        // Mocking authentication for now, matching RBAC logic.
        // In a real scenario, this would check against the Prisma User model.
        if (credentials?.email === "admin@iec.pucminas.br" && credentials?.password === "admin") {
          return { id: "1", name: "Admin IEC", email: "admin@iec.pucminas.br", role: "ADMIN" };
        }
        if (credentials?.email === "analyst@iec.pucminas.br" && credentials?.password === "analyst") {
          return { id: "2", name: "Analista IEC", email: "analyst@iec.pucminas.br", role: "ANALYST" };
        }
        if (credentials?.email === "viewer@iec.pucminas.br" && credentials?.password === "viewer") {
          return { id: "3", name: "Visitante IEC", email: "viewer@iec.pucminas.br", role: "VIEWER" };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: "jwt"
  },
  secret: process.env.NEXTAUTH_SECRET || "fallback_secret_for_local_dev",
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
