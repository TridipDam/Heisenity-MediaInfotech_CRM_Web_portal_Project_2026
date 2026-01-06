import CredentialsProvider from "next-auth/providers/credentials"
import type { AuthOptions } from "next-auth"

interface CustomUser {
  id: string
  email: string
  name: string
  userType: string
  employeeId?: string
  adminId?: string
}

const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        employeeId: { label: "Employee ID", type: "text" },
        adminId: { label: "Admin ID", type: "text" },
        userType: { label: "User Type", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const { email, password, employeeId, adminId, userType } = credentials

        try {
          const response = await fetch(`${process.env.BACKEND_URL}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              password,
              employeeId: userType === "employee" ? employeeId : undefined,
              adminId: userType === "admin" ? adminId : undefined,
              userType
            })
          })

          if (!response.ok) {
            return null
          }

          const user = await response.json()
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            employeeId: user.employeeId,
            adminId: user.adminId,
            userType: user.userType,
            sessionToken: user.sessionToken
          }
        } catch (error) {
          console.error("Auth error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const customUser = user as CustomUser
        token.userType = customUser.userType
        token.employeeId = customUser.employeeId
        token.adminId = customUser.adminId
        token.sessionToken = (customUser as any).sessionToken
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub!
        ;(session.user as CustomUser).userType = token.userType as string
        ;(session.user as CustomUser).employeeId = token.employeeId as string
        ;(session.user as CustomUser).adminId = token.adminId as string
        ;(session.user as any).sessionToken = token.sessionToken as string
      }
      return session
    },
    async signIn() {
      return true
    },
    async redirect({ url, baseUrl }) {
      // Allows relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`
      // Allows callback URLs on the same origin
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },
  pages: {
    signIn: "/login",
    signOut: "/login"
  },
  session: {
    strategy: "jwt" as const
  }
}

export { authOptions }