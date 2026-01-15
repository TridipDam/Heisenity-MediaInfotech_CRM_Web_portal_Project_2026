"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Shield, Save, User, ChevronDown } from "lucide-react"
import { getAllStaffFeatureAccess, updateStaffFeatureAccess, type StaffPortalFeature } from "@/lib/server-api"
import { showToast } from "@/lib/toast-utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type StaffFeatureData = {
  id: string
  employeeId: string
  name: string
  email: string
  role: string
  features: Record<StaffPortalFeature, boolean>
}

const AVAILABLE_FEATURES: StaffPortalFeature[] = ['DASHBOARD', 'PROJECT', 'TASK_MANAGEMENT']

const FEATURE_LABELS: Record<StaffPortalFeature, string> = {
  DASHBOARD: 'Dashboard',
  PROJECT: 'Project Management',
  TASK_MANAGEMENT: 'Task Management'
}

export function StaffFeatureAccessManagement() {
  const [staffList, setStaffList] = useState<StaffFeatureData[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState<string>("")
  const [selectedStaff, setSelectedStaff] = useState<StaffFeatureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [features, setFeatures] = useState<Record<StaffPortalFeature, boolean>>({
    DASHBOARD: false,
    PROJECT: false,
    TASK_MANAGEMENT: false
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    fetchStaffFeatureAccess()
  }, [])

  useEffect(() => {
    if (selectedStaffId) {
      const staff = staffList.find(s => s.id === selectedStaffId)
      if (staff) {
        setSelectedStaff(staff)
        setFeatures({
          DASHBOARD: staff.features.DASHBOARD || false,
          PROJECT: staff.features.PROJECT || false,
          TASK_MANAGEMENT: staff.features.TASK_MANAGEMENT || false
        })
        setHasChanges(false)
      }
    } else {
      setSelectedStaff(null)
      setFeatures({
        DASHBOARD: false,
        PROJECT: false,
        TASK_MANAGEMENT: false
      })
      setHasChanges(false)
    }
  }, [selectedStaffId, staffList])

  const fetchStaffFeatureAccess = async () => {
    try {
      setLoading(true)
      const response = await getAllStaffFeatureAccess()

      if (response.success && response.data) {
        setStaffList(response.data)
      } else {
        showToast.error(response.error || 'Failed to load staff feature access')
      }
    } catch (error) {
      console.error('Error fetching staff feature access:', error)
      showToast.error('Failed to load staff feature access')
    } finally {
      setLoading(false)
    }
  }

  const handleFeatureToggle = (feature: StaffPortalFeature) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: !prev[feature]
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!selectedStaff) return

    try {
      setSaving(true)

      const featuresToUpdate = AVAILABLE_FEATURES.map(feature => ({
        feature,
        isAllowed: features[feature]
      }))

      const response = await updateStaffFeatureAccess(selectedStaff.id, {
        features: featuresToUpdate
      })

      if (response.success) {
        showToast.success('Feature access updated successfully')
        
        // Update local state
        setStaffList(prev => prev.map(s => {
          if (s.id === selectedStaff.id) {
            return { ...s, features: { ...features } }
          }
          return s
        }))

        setHasChanges(false)
      } else {
        showToast.error(response.error || 'Failed to update feature access')
      }
    } catch (error) {
      console.error('Error updating feature access:', error)
      showToast.error('Failed to update feature access')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    if (selectedStaff) {
      setFeatures({
        DASHBOARD: selectedStaff.features.DASHBOARD || false,
        PROJECT: selectedStaff.features.PROJECT || false,
        TASK_MANAGEMENT: selectedStaff.features.TASK_MANAGEMENT || false
      })
      setHasChanges(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Staff Feature Access</h2>
        <p className="text-gray-600 mt-1">
          Control which features IN_OFFICE staff can access
        </p>
      </div>

      {staffList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No IN_OFFICE Staff Members</h3>
            <p className="text-gray-600">
              No active IN_OFFICE staff members found in the system.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Select Staff Member</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Employee Dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Select Employee
              </label>
              <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose an employee..." />
                </SelectTrigger>
                <SelectContent>
                  {staffList.map(staff => (
                    <SelectItem key={staff.id} value={staff.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{staff.name}</span>
                        <span className="text-gray-500">({staff.employeeId})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Feature Checkboxes - Only show when staff is selected */}
            {selectedStaff && (
              <>
                <div className="border-t pt-6">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
                    <Shield className="h-4 w-4" />
                    <span className="font-medium">Feature Permissions for {selectedStaff.name}</span>
                  </div>
                  
                  <div className="space-y-3">
                    {AVAILABLE_FEATURES.map(feature => (
                      <div
                        key={feature}
                        className="flex items-center space-x-3 p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
                      >
                        <Checkbox
                          id={feature}
                          checked={features[feature]}
                          onCheckedChange={() => handleFeatureToggle(feature)}
                        />
                        <label
                          htmlFor={feature}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="font-medium text-gray-900">
                            {FEATURE_LABELS[feature]}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {features[feature] ? 'Enabled' : 'Disabled'}
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                {hasChanges && (
                  <div className="flex items-center gap-3 pt-4 border-t">
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      disabled={saving}
                      className="flex-1"
                    >
                      Reset
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}

            {/* Empty State */}
            {!selectedStaff && (
              <div className="text-center py-8 text-gray-500">
                <ChevronDown className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p>Select an employee from the dropdown above</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
