import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { isAdminEmail, normalizeEmail } from "@/lib/admin";
import mongooseConnect from "@/lib/mongooseConnect";
import User from "@/models/User";

/** @type {import("next-auth").NextAuthOptions} */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        isGuest: { label: "Guest", type: "text" }
      },
      async authorize(credentials) {
        if (credentials.isGuest === "true") {
          await mongooseConnect();
          const Settings = (await import('@/models/Settings')).default;
          const settings = await Settings.findOne({ singletonKey: 'site-settings' }).lean();
          if (!settings || settings.guestModeEnabled !== true) {
             return null;
          }
          return { id: "guest", name: "Demo Guest", email: "guest@demo.com", isDemo: true };
        }
        if (
          credentials.email &&
          credentials.password &&
          isAdminEmail(credentials.email) &&
          credentials.password === process.env.ADMIN_PASSWORD
        ) {
          return { id: "1", name: "Raza Admin", email: normalizeEmail(credentials.email) };
        }
        return null;
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account.provider === "google") {
        try {
          await mongooseConnect();
          const normalizedEmail = normalizeEmail(user.email);
          
          const existingUser = await User.findOne({ email: normalizedEmail });
          
          if (existingUser && existingUser.disabled) {
            return false; // Prevent sign in
          }

          const dbUser = await User.findOneAndUpdate(
            { email: normalizedEmail },
            { 
              name: user.name, 
              image: user.image,
              email: normalizedEmail
            },
            { upsert: true, new: true }
          ).lean();

          if (!existingUser) {
            // New User Signup - Create Notification
            const Notification = (await import('@/models/Notification')).default;
            await Notification.create({
              type: 'user',
              message: `New user ${user.name} just signed up`,
              link: `/admin/users?id=${dbUser._id}`, // Deep link with ID
              metadata: {
                userName: user.name,
                userId: dbUser._id.toString(),
              }
            });
          }

          return true;
        } catch (error) {
          console.error("Error saving user profile:", error);
          return true; // Still allow sign in even if profile save fails
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      if (user?.isDemo) {
        token.isDemo = true;
        token.isAdmin = true;
      }

      const email = user?.email || token?.email;
      
      if (email) {
        token.email = normalizeEmail(email);
        
        // Check env-configured admins first
        let isAdmin = isAdminEmail(email) || token.isDemo;
        
        // Also check dynamically managed admin emails stored in DB
        if (!isAdmin) {
          try {
            const Settings = (await import('@/models/Settings')).default;
            const settings = await Settings.findOne({ singletonKey: 'site-settings' }).select('adminEmails').lean();
            if (settings?.adminEmails?.includes(normalizeEmail(email))) {
              isAdmin = true;
            }
          } catch (err) {
            console.error('DB admin check failed:', err);
          }
        }

        token.isAdmin = isAdmin;

        // Phase 2: Strict Session Validation
        // Avoid DB check for static admin if possible, but for regular users we must check status
        if (token.isDemo) return token;

        try {
          // We only need to check DB if it's not the initial sign in (where user is provided)
          // or if we want to enforce "immediate" logout on every request/refresh
          await mongooseConnect();
          const dbUser = await User.findOne({ email: token.email }).select('disabled forceLogoutAt').lean();
          
          if (dbUser) {
            // 1. Check if user is disabled
            if (dbUser.disabled) {
              return null; // This invalidates the JWT
            }

            // 2. Check if session was forced to logout
            if (dbUser.forceLogoutAt && token.iat) {
              const forceLogoutTime = new Date(dbUser.forceLogoutAt).getTime();
              const tokenIssuedAt = token.iat * 1000;
              
              if (tokenIssuedAt < forceLogoutTime) {
                return null;
              }
            }
          }
        } catch (error) {
          console.error("Auth DB Check Error:", error);
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.email = normalizeEmail(session.user.email || token?.email);
        // @ts-ignore - isAdmin is custom
        session.user.isAdmin = Boolean(token?.isAdmin);
        // @ts-ignore - isDemo is custom
        session.user.isDemo = Boolean(token?.isDemo);
      }
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
};
