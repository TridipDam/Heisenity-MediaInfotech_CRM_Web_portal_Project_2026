import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const { pathname } = req.nextUrl

    // If user is authenticated
    if (token) {
      const userType = token.userType as string

      // Employee/Staff access restrictions
      if (userType === 'employee') {
        // Allow employees to access staff-portal, employee-attendance, and vehicles pages
        const allowedEmployeePaths = ['/staff-portal', '/employee-attendance', '/vehicles']
        const isAllowedPath = allowedEmployeePaths.some(path => pathname.startsWith(path))
        
        if (!isAllowedPath) {
          // Redirect employees to staff-portal if they try to access restricted areas
          return NextResponse.redirect(new URL('/staff-portal', req.url))
        }
      }

      // Admin access - allow all pages, but redirect from landing to dashboard
      if (userType === 'admin') {
        // Redirect admins from landing to dashboard
        if (pathname === '/landing') {
          return NextResponse.redirect(new URL('/dashboard', req.url))
        }
      }
    } else {
      // Not authenticated - redirect to root for protected pages
      const publicPaths = ['/login', '/landing']
      
      // Redirect /landing to root for consistency
      if (pathname === '/landing') {
        return NextResponse.redirect(new URL('/', req.url))
      }
      
      // Redirect other protected pages to root
      if (!publicPaths.includes(pathname)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public pages that don't require authentication
        const publicPaths = ['/login', '/landing']
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
    "/staff-portal/:path*"
  ]
}