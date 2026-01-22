"use client"

import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/components/providers/session-provider";
import { NotificationProvider } from "@/lib/notification-context";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";

interface CustomUser {
  id: string
  email: string
  name: string
  userType: string
  employeeId?: string
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  
  // Pages that should not show sidebar (public/auth pages and customer portal)
  const isAuthPage = pathname === '/' || pathname === '/landing' || pathname === '/admin-login'
  const isEmployeePage = pathname === '/employee-attendance' || pathname === '/staff-portal'
  const isCustomerPage = pathname === '/customer-portal'
  
  // Check if user is employee
  const isEmployee = session?.user && (session.user as CustomUser).userType === 'EMPLOYEE'

  // For auth pages, employee attendance page, or customer portal, don't show sidebar
  if (isAuthPage || isEmployeePage || isCustomerPage) {
    return <div className="min-h-screen">{children}</div>
  }

  // For employees, only show sidebar on allowed pages (but not on staff-portal or employee-attendance)
  if (isEmployee && pathname !== '/landing' && pathname !== '/attendance' && pathname !== '/staff-portal' && pathname !== '/employee-attendance') {
    return <div className="min-h-screen">{children}</div>
  }

  // For admins or allowed employee pages, show sidebar
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <title>CRM Demo</title>
        <meta name="description" content="CRM Demo Application" />
      </head>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <NotificationProvider>
            <LayoutContent>{children}</LayoutContent>
            <Toaster />
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
