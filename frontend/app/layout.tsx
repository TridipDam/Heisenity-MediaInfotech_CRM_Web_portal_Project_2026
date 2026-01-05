"use client"

import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AuthProvider } from "@/components/providers/session-provider";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

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
  
  const isAuthPage = pathname === '/landing' || pathname === '/login'
  const isEmployeePage = pathname === '/employee-attendance'
  
  // Check if user is employee
  const isEmployee = session?.user && (session.user as CustomUser).userType === 'employee'

  // For auth pages or employee attendance page, don't show sidebar
  if (isAuthPage || isEmployeePage) {
    return <div className="min-h-screen">{children}</div>
  }

  // For employees, only show sidebar on allowed pages (landing, attendance)
  if (isEmployee && pathname !== '/landing' && pathname !== '/attendance') {
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
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
