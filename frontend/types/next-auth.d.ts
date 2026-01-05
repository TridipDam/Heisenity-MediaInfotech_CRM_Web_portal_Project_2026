import NextAuth from "next-auth"

declare module "next-auth" {
  interface User {
    userType?: string
    employeeId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      userType?: string
      employeeId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userType?: string
    employeeId?: string
  }
}