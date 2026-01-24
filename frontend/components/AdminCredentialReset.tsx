"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { 
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { 
    Shield, 
    Key, 
    Eye, 
    EyeOff, 
    RefreshCw, 
    CheckCircle, 
    AlertTriangle,
    Users,
    Mail,
    User,
    Lock
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch'

interface Admin {
    id: string
    name: string
    adminId: string
    email: string
    phone?: string
    status: string
    createdAt: string
    updatedAt: string
}

interface AdminCredentialResetProps {
    adminId: string
    adminName: string
}

export function AdminCredentialReset({ adminId, adminName }: AdminCredentialResetProps) {
    const { toast } = useToast()
    const { authenticatedFetch } = useAuthenticatedFetch()
    const [admins, setAdmins] = useState<Admin[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
    const [resetting, setResetting] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    
    const [resetOptions, setResetOptions] = useState({
        resetAdminId: false,
        resetEmail: false,
        resetPassword: false
    })
    
    const [resetForm, setResetForm] = useState({
        newAdminId: '',
        newEmail: '',
        newPassword: '',
        confirmPassword: ''
    })

    // Fetch all admins
    const fetchAdmins = async () => {
        try {
            setLoading(true)
            const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/admins`)
            const result = await response.json()
            
            if (result.success) {
                setAdmins(result.data || [])
            } else {
                toast({
                    title: "Error",
                    description: "Failed to fetch administrators",
                    variant: "destructive"
                })
            }
        } catch (error) {
            console.error('Error fetching admins:', error)
            toast({
                title: "Error",
                description: "Failed to fetch administrators",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchAdmins()
    }, [])

    const handleResetCredentials = async () => {
        if (!selectedAdmin) return

        // Check if at least one option is selected
        if (!resetOptions.resetAdminId && !resetOptions.resetEmail && !resetOptions.resetPassword) {
            toast({
                title: "Validation Error",
                description: "Please select at least one credential to reset",
                variant: "destructive"
            })
            return
        }

        // Validate Admin ID if selected
        if (resetOptions.resetAdminId) {
            if (!resetForm.newAdminId.trim()) {
                toast({
                    title: "Validation Error",
                    description: "Please enter a new Admin ID",
                    variant: "destructive"
                })
                return
            }
            if (resetForm.newAdminId.length < 3) {
                toast({
                    title: "Validation Error",
                    description: "Admin ID must be at least 3 characters long",
                    variant: "destructive"
                })
                return
            }
        }

        // Validate Email if selected
        if (resetOptions.resetEmail) {
            if (!resetForm.newEmail.trim()) {
                toast({
                    title: "Validation Error",
                    description: "Please enter a new email address",
                    variant: "destructive"
                })
                return
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(resetForm.newEmail)) {
                toast({
                    title: "Validation Error",
                    description: "Please enter a valid email address",
                    variant: "destructive"
                })
                return
            }
        }

        // Validate Password if selected
        if (resetOptions.resetPassword) {
            if (!resetForm.newPassword || !resetForm.confirmPassword) {
                toast({
                    title: "Validation Error",
                    description: "Please fill in all password fields",
                    variant: "destructive"
                })
                return
            }

            if (resetForm.newPassword !== resetForm.confirmPassword) {
                toast({
                    title: "Validation Error",
                    description: "Passwords do not match",
                    variant: "destructive"
                })
                return
            }

            if (resetForm.newPassword.length < 6) {
                toast({
                    title: "Validation Error",
                    description: "Password must be at least 6 characters long",
                    variant: "destructive"
                })
                return
            }
        }

        try {
            setResetting(true)
            
            // Prepare request body
            const requestBody: any = {}
            if (resetOptions.resetAdminId) requestBody.newAdminId = resetForm.newAdminId.trim()
            if (resetOptions.resetEmail) requestBody.newEmail = resetForm.newEmail.trim()
            if (resetOptions.resetPassword) {
                requestBody.newPassword = resetForm.newPassword
                requestBody.confirmPassword = resetForm.confirmPassword
            }

            const response = await authenticatedFetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/admins/${selectedAdmin.id}/reset-credentials`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                }
            )

            const result = await response.json()

            if (result.success) {
                toast({
                    title: "Success",
                    description: result.message || `Credentials updated successfully for ${selectedAdmin.name}`,
                })
                
                // Reset form and close dialog
                setResetForm({ newAdminId: '', newEmail: '', newPassword: '', confirmPassword: '' })
                setResetOptions({ resetAdminId: false, resetEmail: false, resetPassword: false })
                setIsResetDialogOpen(false)
                setSelectedAdmin(null)
                setShowPassword(false)
                setShowConfirmPassword(false)
                
                // Refresh admin list to show updated data
                fetchAdmins()
            } else {
                throw new Error(result.error || 'Failed to reset credentials')
            }
        } catch (error) {
            console.error('Error resetting credentials:', error)
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to reset credentials",
                variant: "destructive"
            })
        } finally {
            setResetting(false)
        }
    }

    const handleSelectAdmin = (admin: Admin) => {
        setSelectedAdmin(admin)
        setResetForm({ 
            newAdminId: admin.adminId, 
            newEmail: admin.email, 
            newPassword: '', 
            confirmPassword: '' 
        })
        setResetOptions({ resetAdminId: false, resetEmail: false, resetPassword: false })
        setShowPassword(false)
        setShowConfirmPassword(false)
        setIsResetDialogOpen(true)
    }

    const getStatusBadgeColor = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-700 border-green-200'
            case 'INACTIVE':
                return 'bg-gray-100 text-gray-700 border-gray-200'
            case 'SUSPENDED':
                return 'bg-red-100 text-red-700 border-red-200'
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const getSelectedCredentials = () => {
        const selected = []
        if (resetOptions.resetAdminId) selected.push('Admin ID')
        if (resetOptions.resetEmail) selected.push('Email')
        if (resetOptions.resetPassword) selected.push('Password')
        return selected
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="flex items-center justify-center h-32">
                        <div className="text-center">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                            <p className="text-muted-foreground">Loading administrators...</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Key className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                            <CardTitle className="text-xl">Admin Credential Reset</CardTitle>
                            <CardDescription>
                                Reset login credentials (ID, Email, Password) for administrators
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Warning Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-amber-800">Security Notice</h4>
                                <p className="text-sm text-amber-700 mt-1">
                                    Resetting administrator credentials will immediately invalidate their current login sessions. 
                                    They will need to log in again with the new credentials.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Admin List */}
                    <div className="space-y-3">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Select Administrator
                        </h3>
                        
                        {admins.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Shield className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                                <p>No administrators found</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {admins.map((admin) => (
                                    <div
                                        key={admin.id}
                                        className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white font-semibold text-sm">
                                                <Shield className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-foreground flex items-center gap-2">
                                                    {admin.name}
                                                    <Badge className={getStatusBadgeColor(admin.status)}>
                                                        {admin.status}
                                                    </Badge>
                                                </div>
                                                <div className="text-sm text-muted-foreground">
                                                    {admin.adminId} • {admin.email}
                                                </div>
                                            </div>
                                        </div>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    className="gap-2"
                                                    disabled={admin.status !== 'ACTIVE'}
                                                >
                                                    <Key className="h-4 w-4" />
                                                    Reset Credentials
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Confirm Credential Reset</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to reset credentials for <strong>{admin.name}</strong> ({admin.adminId})?
                                                        <br /><br />
                                                        This action will:
                                                        <ul className="list-disc list-inside mt-2 space-y-1">
                                                            <li>Allow you to change their Admin ID, Email, and/or Password</li>
                                                            <li>Invalidate their current login sessions</li>
                                                            <li>Require them to log in with new credentials</li>
                                                            <li>Cannot be undone</li>
                                                        </ul>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleSelectAdmin(admin)}
                                                        className="bg-orange-600 hover:bg-orange-700"
                                                    >
                                                        Proceed to Reset
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Credential Reset Dialog */}
            <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5 text-orange-600" />
                            Reset Credentials
                        </DialogTitle>
                        <DialogDescription>
                            Select and update credentials for {selectedAdmin?.name} ({selectedAdmin?.adminId})
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 mt-4">
                        {/* Credential Selection */}
                        <div className="space-y-4">
                            <h4 className="font-medium text-foreground">Select credentials to reset:</h4>
                            
                            {/* Admin ID Option */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="resetAdminId"
                                    checked={resetOptions.resetAdminId}
                                    onCheckedChange={(checked) => 
                                        setResetOptions(prev => ({ ...prev, resetAdminId: checked as boolean }))
                                    }
                                />
                                <div className="grid gap-2 flex-1">
                                    <Label htmlFor="resetAdminId" className="flex items-center gap-2 cursor-pointer">
                                        <User className="h-4 w-4" />
                                        Admin ID
                                    </Label>
                                    {resetOptions.resetAdminId && (
                                        <Input
                                            value={resetForm.newAdminId}
                                            onChange={(e) => setResetForm(prev => ({ ...prev, newAdminId: e.target.value }))}
                                            placeholder="Enter new Admin ID"
                                            className="ml-6"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Email Option */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="resetEmail"
                                    checked={resetOptions.resetEmail}
                                    onCheckedChange={(checked) => 
                                        setResetOptions(prev => ({ ...prev, resetEmail: checked as boolean }))
                                    }
                                />
                                <div className="grid gap-2 flex-1">
                                    <Label htmlFor="resetEmail" className="flex items-center gap-2 cursor-pointer">
                                        <Mail className="h-4 w-4" />
                                        Email Address
                                    </Label>
                                    {resetOptions.resetEmail && (
                                        <Input
                                            type="email"
                                            value={resetForm.newEmail}
                                            onChange={(e) => setResetForm(prev => ({ ...prev, newEmail: e.target.value }))}
                                            placeholder="Enter new email address"
                                            className="ml-6"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Password Option */}
                            <div className="flex items-start space-x-3">
                                <Checkbox
                                    id="resetPassword"
                                    checked={resetOptions.resetPassword}
                                    onCheckedChange={(checked) => 
                                        setResetOptions(prev => ({ ...prev, resetPassword: checked as boolean }))
                                    }
                                />
                                <div className="grid gap-2 flex-1">
                                    <Label htmlFor="resetPassword" className="flex items-center gap-2 cursor-pointer">
                                        <Lock className="h-4 w-4" />
                                        Password
                                    </Label>
                                    {resetOptions.resetPassword && (
                                        <div className="ml-6 space-y-3">
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    value={resetForm.newPassword}
                                                    onChange={(e) => setResetForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                                    placeholder="Enter new password"
                                                    className="pr-10"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? (
                                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </Button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={resetForm.confirmPassword}
                                                    onChange={(e) => setResetForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                                    placeholder="Confirm new password"
                                                    className="pr-10"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-4 w-4 text-gray-400" />
                                                    ) : (
                                                        <Eye className="h-4 w-4 text-gray-400" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Requirements */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <h4 className="text-sm font-medium text-blue-800 mb-2">Requirements:</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                                <li className="flex items-center gap-2">
                                    <CheckCircle className={`h-3 w-3 ${resetOptions.resetAdminId && resetForm.newAdminId.length >= 3 ? 'text-green-600' : 'text-gray-400'}`} />
                                    Admin ID: At least 3 characters
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className={`h-3 w-3 ${resetOptions.resetEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetForm.newEmail) ? 'text-green-600' : 'text-gray-400'}`} />
                                    Email: Valid email format
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className={`h-3 w-3 ${resetOptions.resetPassword && resetForm.newPassword.length >= 6 ? 'text-green-600' : 'text-gray-400'}`} />
                                    Password: At least 6 characters
                                </li>
                                <li className="flex items-center gap-2">
                                    <CheckCircle className={`h-3 w-3 ${resetOptions.resetPassword && resetForm.newPassword === resetForm.confirmPassword && resetForm.newPassword.length > 0 ? 'text-green-600' : 'text-gray-400'}`} />
                                    Password: Confirmation matches
                                </li>
                            </ul>
                        </div>

                        {/* Selected Summary */}
                        {getSelectedCredentials().length > 0 && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                <h4 className="text-sm font-medium text-green-800 mb-1">Will reset:</h4>
                                <p className="text-sm text-green-700">{getSelectedCredentials().join(', ')}</p>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end space-x-3 mt-6">
                        <Button 
                            variant="outline" 
                            onClick={() => setIsResetDialogOpen(false)}
                            disabled={resetting}
                        >
                            Cancel
                        </Button>
                        <Button 
                            onClick={handleResetCredentials}
                            disabled={resetting || getSelectedCredentials().length === 0}
                            className="bg-orange-600 hover:bg-orange-700"
                        >
                            {resetting ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                    Updating...
                                </>
                            ) : (
                                <>
                                    <Key className="h-4 w-4 mr-2" />
                                    Reset Credentials
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}