import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // If user is authenticated
    if (token) {
      const userType = token.userType as string

      // Employee access restrictions
      if (userType === 'employee') {
        // Allow employees to access only landing, attendance, and employee-attendance pages
        const allowedEmployeePaths = ['/landing', '/attendance', '/employee-attendance', '/login', '/signup']
        const isAllowedPath = allowedEmployeePaths.some(path => pathname.startsWith(path))
        
        if (!isAllowedPath) {
          // Redirect employees to landing page if they try to access restricted areas
          return NextResponse.redirect(new URL('/landing', req.url))
        }
      }

      // Admin access - allow all pages
      if (userType === 'admin') {
        // Admins can access everything, no restrictions
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public pages that don't require authentication
        const publicPaths = ['/login', '/signup', '/landing']
        if (publicPaths.includes(pathname)) {
          return true
        }

        // All other pages require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*", 
    "/employee/:path*",
    "/attendance/:path*",
    "/payroll/:path*",
    "/stock/:path*",
    "/tickets/:path*",
    "/"
  ]
}