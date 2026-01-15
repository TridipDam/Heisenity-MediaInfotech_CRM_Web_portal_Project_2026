"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
    SidebarFooter,
} from "@/components/ui/sidebar"
import { 
    LayoutDashboard, 
    Users, 
    Ticket, 
    Package,
    ChevronRight,
    LogOut,
    DollarSign,
    UsersRound,
    Clock,
    FileText,
    FolderOpen,
    Gavel
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

const navigationItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
        badge: null,
        description: "Overview and analytics"
    },
    {
        title: "Task Management",
        url: "/attendance",
        icon: Users,
        badge: "12",
        description: "Task tracking"
    },
    {
        title: "Field Engineer",
        url: "/field-engineer-attendance",
        icon: Clock,
        badge: null,
        description: "Field engineer attendance"
    },
    {
        title: "InOffice Employee",
        url: "/inoffice-attendance",
        icon: Clock,
        badge: null,
        description: "In-office attendance management"
    },
    {
        title: "Teams",
        url: "/teams",
        icon: UsersRound,
        badge: null,
        description: "Team management"
    },
    {
        title: "Project Management",
        url: "/projects",
        icon: FolderOpen,
        badge: null,
        description: "Manage ongoing projects and updates"
    },
    {
        title: "Tender Management",
        url: "/tenders",
        icon: Gavel,
        badge: null,
        description: "Manage tenders, EMD tracking, and documents"
    },
    {
        title: "Docs. and Leave Management",
        url: "/leave-management",
        icon: FileText,
        badge: null,
        description: "Employee leave and docs upload system",
        dynamicBadge: true
    },
    {
        title: "Staff Feature Access",
        url: "/staff-feature-access",
        icon: UsersRound,
        badge: null,
        description: "Control staff portal features"
    },
    {
        title: "Payroll",
        url: "/payroll",
        icon: DollarSign,
        badge: "2",
        description: "Salary and compensation"
    },
    {
        title: "Stock Management",
        url: "/stock",
        icon: Package,
        badge: "45",
        description: "Inventory and supplies"
    },
    {
        title: "Tickets",
        url: "/tickets",
        icon: Ticket,
        badge: "3",
        description: "Support requests"
    },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()
    const { data: session } = useSession()
    const [pendingLeaveCount, setPendingLeaveCount] = React.useState<number>(0)

    // Fetch pending leave applications count for admin
    React.useEffect(() => {
        const fetchPendingLeaveCount = async () => {
            if (!session?.user || (session.user as any).userType !== 'ADMIN') return
            
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/leave/applications`)
                const result = await response.json()
                
                if (result.success) {
                    const pendingCount = (result.data || []).filter((app: any) => app.status === 'PENDING').length
                    setPendingLeaveCount(pendingCount)
                }
            } catch (error) {
                console.error('Error fetching pending leave count:', error)
            }
        }

        fetchPendingLeaveCount()
        
        // Refresh count every 30 seconds
        const interval = setInterval(fetchPendingLeaveCount, 30000)
        return () => clearInterval(interval)
    }, [session])

    // Filter navigation items based on user type
    const getFilteredNavigationItems = () => {
        if (!session?.user) return navigationItems

        const userType = (session.user as any).userType
        
        if (userType === 'EMPLOYEE') {
            // Employees can see Attendance and Attendance Management
            return navigationItems.filter(item => 
                item.url === '/attendance' || item.url === '/attendance-management'
            )
        }
        
        // Admins see all items
        return navigationItems
    }

    const filteredNavigationItems = getFilteredNavigationItems()

    // Get user initials
    const getUserInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const handleLogout = () => {
        console.log('Logout clicked')
        signOut({ 
            callbackUrl: '/',
            redirect: true 
        }).then(() => {
            console.log('Logout successful')
        }).catch((error) => {
            console.error('Logout error:', error)
        })
    }

    return (
        <Sidebar {...props} className="border-r border-border bg-background">
            <SidebarHeader className="border-b border-border p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
                            <Image 
                                src="/Media_Infotech.webp" 
                                alt="Media Infotech Logo" 
                                width={40} 
                                height={40}
                                className="object-contain"
                            />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-bold text-foreground">Enterprise</span>
                            <span className="text-sm text-muted-foreground">Management Suite</span>
                        </div>
                    </div>
                </div>
            </SidebarHeader>

            <SidebarContent className="px-4 py-6">
                {/* Main Navigation */}
                <SidebarGroup>
                    <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                        Main Navigation
                    </SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu className="space-y-1">
                            {filteredNavigationItems.map((item) => {
                                const isActive = pathname === item.url
                                return (
                                    <SidebarMenuItem key={item.title}>
                                        <SidebarMenuButton 
                                            asChild 
                                            className={`
                                                group relative h-12 px-3 rounded-lg transition-all duration-200 hover:bg-accent
                                                ${isActive 
                                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                                                    : 'text-foreground hover:text-foreground'
                                                }
                                            `}
                                        >
                                            <Link href={item.url} className="flex items-center gap-3 w-full">
                                                <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                                <div className="flex flex-col flex-1 min-w-0">
                                                    <span className="font-medium text-sm truncate">{item.title}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {item.dynamicBadge && item.title === "Leave Management" && pendingLeaveCount > 0 ? (
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`
                                                                text-xs px-2 py-0.5 font-medium bg-yellow-100 text-yellow-700
                                                                ${isActive 
                                                                    ? 'bg-blue-100 text-blue-700' 
                                                                    : ''
                                                                }
                                                            `}
                                                        >
                                                            {pendingLeaveCount}
                                                        </Badge>
                                                    ) : item.badge && (
                                                        <Badge 
                                                            variant="secondary" 
                                                            className={`
                                                                text-xs px-2 py-0.5 font-medium
                                                                ${isActive 
                                                                    ? 'bg-blue-100 text-blue-700' 
                                                                    : 'bg-muted text-muted-foreground'
                                                                }
                                                            `}
                                                        >
                                                            {item.badge}
                                                        </Badge>
                                                    )}
                                                    {isActive && (
                                                        <ChevronRight className="h-4 w-4 text-blue-600" />
                                                    )}
                                                </div>
                                            </Link>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                )
                            })}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <Separator />
                </SidebarContent>

            {/* User Profile Footer */}
            <SidebarFooter className="border-t border-border p-4">
                {session?.user ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted hover:bg-accent transition-colors">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-gray-600 to-gray-700 text-white font-semibold text-sm">
                            {getUserInitials(session.user.name || 'User')}
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-sm text-foreground truncate">
                                {session.user.name}
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground truncate">
                                    {(session.user as any).userType === 'ADMIN' ? 'Admin' : 'Employee'}
                                </span>
                                {((session.user as any).employeeId || (session.user as any).adminId) && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                                        ID: {(session.user as any).employeeId || (session.user as any).adminId}
                                    </Badge>
                                )}
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300">
                            <span className="text-gray-600 text-sm">?</span>
                        </div>
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-semibold text-sm text-foreground">Not logged in</span>
                            <span className="text-xs text-muted-foreground">Please sign in</span>
                        </div>
                    </div>
                )}
            </SidebarFooter>

            <SidebarRail />
        </Sidebar>
    )
}