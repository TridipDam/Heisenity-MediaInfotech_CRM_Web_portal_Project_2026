"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Wand2, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Info,
  Copy,
  Eye
} from "lucide-react"
import { 
  generateNextEmployeeId, 
  checkEmployeeIdAvailability, 
  getNextAvailableEmployeeIds,
  validateEmployeeIdFormat 
} from "@/lib/server-api"

interface EmployeeIdGeneratorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function EmployeeIdGenerator({ value, onChange, disabled }: EmployeeIdGeneratorProps) {
  const [loading, setLoading] = React.useState(false)
  const [checking, setChecking] = React.useState(false)
  const [showPreview, setShowPreview] = React.useState(false)
  const [availability, setAvailability] = React.useState<{
    available: boolean | null
    message: string
  }>({ available: null, message: '' })
  const [nextIds, setNextIds] = React.useState<string[]>([])

  // Auto-generate ID on component mount if no value is provided
  React.useEffect(() => {
    if (!value && !disabled) {
      handleGenerateId()
    }
  }, [])

  // Simple client-side ID generator as fallback that follows proper sequence
  const generateFallbackId = async () => {
    try {
      // Try to get existing attendance records to find the highest employee ID
      const response = await fetch('/api/v1/attendance?limit=1000')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data?.records) {
          const existingIds = data.data.records
            .map((record: any) => record.employeeId)
            .filter((id: string) => id && id.startsWith('EMP'))
          
          let highestNumber = 0
          for (const id of existingIds) {
            const match = id.match(/^EMP(\d+)$/)
            if (match) {
              const number = parseInt(match[1], 10)
              if (number > highestNumber) {
                highestNumber = number
              }
            }
          }
          
          const nextNumber = highestNumber + 1
          return `EMP${nextNumber.toString().padStart(3, '0')}`
        }
      }
    } catch (error) {
      console.log('Could not fetch existing records for fallback')
    }
    
    // Ultimate fallback: start from EMP001
    return 'EMP001'
  }

  // Check availability when value changes
  React.useEffect(() => {
    if (value && value.length >= 6) {
      checkAvailability(value)
    } else {
      setAvailability({ available: null, message: '' })
    }
  }, [value])

  const handleGenerateId = async () => {
    setLoading(true)
    try {
      console.log('Generating employee ID...')
      const response = await generateNextEmployeeId()
      console.log('Generate ID response:', response)
      
      if (response.success && response.data) {
        onChange(response.data.employeeId)
        console.log('Generated ID:', response.data.employeeId)
      } else {
        console.error('Failed to generate ID:', response.message)
        // Fallback: generate a proper sequential ID
        const fallbackId = await generateFallbackId()
        onChange(fallbackId)
        console.log('Using fallback ID:', fallbackId)
      }
    } catch (error) {
      console.error('Error generating employee ID:', error)
      // Fallback: generate a proper sequential ID
      const fallbackId = await generateFallbackId()
      onChange(fallbackId)
      console.log('Using fallback ID due to error:', fallbackId)
    } finally {
      setLoading(false)
    }
  }

  const checkAvailability = async (employeeId: string) => {
    if (!employeeId || employeeId.length < 6) return
    
    setChecking(true)
    try {
      // First validate format
      const pattern = /^EMP\d{3}$/
      if (!pattern.test(employeeId)) {
        setAvailability({
          available: false,
          message: 'Invalid format. Use EMP001, EMP002, etc.'
        })
        return
      }

      // Check availability using attendance records as fallback
      try {
        const response = await checkEmployeeIdAvailability(employeeId)
        if (response.success && response.data) {
          setAvailability({
            available: response.data.available,
            message: response.data.available ? 'Available' : 'Already taken'
          })
          return
        }
      } catch (error) {
        console.log('Backend check failed, using fallback method')
      }

      // Fallback: check against attendance records
      const attendanceResponse = await fetch('/api/v1/attendance?limit=1000')
      if (attendanceResponse.ok) {
        const data = await attendanceResponse.json()
        if (data.success && data.data?.records) {
          const existingIds = data.data.records.map((record: any) => record.employeeId)
          const isAvailable = !existingIds.includes(employeeId)
          
          setAvailability({
            available: isAvailable,
            message: isAvailable ? 'Available' : 'Already taken'
          })
          return
        }
      }

      // If all else fails, assume available
      setAvailability({
        available: true,
        message: 'Available (could not verify)'
      })

    } catch (error) {
      console.error('Error checking availability:', error)
      setAvailability({
        available: null,
        message: 'Error checking availability'
      })
    } finally {
      setChecking(false)
    }
  }

  const handleShowPreview = async () => {
    if (showPreview) {
      setShowPreview(false)
      return
    }

    setLoading(true)
    try {
      // Try backend first
      try {
        const response = await getNextAvailableEmployeeIds(5)
        if (response.success && response.data) {
          setNextIds(response.data.nextAvailableIds)
          setShowPreview(true)
          return
        }
      } catch (error) {
        console.log('Backend preview failed, using fallback')
      }

      // Fallback: generate preview using attendance records
      const attendanceResponse = await fetch('/api/v1/attendance?limit=1000')
      if (attendanceResponse.ok) {
        const data = await attendanceResponse.json()
        if (data.success && data.data?.records) {
          const existingIds = data.data.records
            .map((record: any) => record.employeeId)
            .filter((id: string) => id && id.startsWith('EMP'))
          
          let highestNumber = 0
          for (const id of existingIds) {
            const match = id.match(/^EMP(\d+)$/)
            if (match) {
              const number = parseInt(match[1], 10)
              if (number > highestNumber) {
                highestNumber = number
              }
            }
          }
          
          const previewIds = []
          for (let i = 1; i <= 5; i++) {
            const nextNumber = highestNumber + i
            previewIds.push(`EMP${nextNumber.toString().padStart(3, '0')}`)
          }
          
          setNextIds(previewIds)
          setShowPreview(true)
          return
        }
      }

      // Ultimate fallback
      setNextIds(['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'])
      setShowPreview(true)

    } catch (error) {
      console.error('Error getting preview IDs:', error)
      // Show default preview
      setNextIds(['EMP001', 'EMP002', 'EMP003', 'EMP004', 'EMP005'])
      setShowPreview(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectId = (selectedId: string) => {
    onChange(selectedId)
    setShowPreview(false)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const getAvailabilityIcon = () => {
    if (checking) return <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
    if (availability.available === true) return <CheckCircle className="h-4 w-4 text-green-600" />
    if (availability.available === false) return <XCircle className="h-4 w-4 text-red-600" />
    return null
  }

  const getAvailabilityColor = () => {
    if (availability.available === true) return 'border-green-300 focus:border-green-500 focus:ring-green-500'
    if (availability.available === false) return 'border-red-300 focus:border-red-500 focus:ring-red-500'
    return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label htmlFor="employeeId" className="text-base font-medium text-gray-700">
          Employee ID <span className="text-red-500">*</span>
        </Label>
        
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="employeeId"
              placeholder="EMP001"
              value={value}
              onChange={(e) => onChange(e.target.value.toUpperCase())}
              disabled={disabled}
              className={`h-12 text-base pr-10 ${getAvailabilityColor()}`}
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {getAvailabilityIcon()}
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerateId}
            disabled={loading || disabled}
            className="h-12 px-4 border-gray-300 hover:bg-gray-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={handleShowPreview}
            disabled={loading || disabled}
            className="h-12 px-4 border-gray-300 hover:bg-gray-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status Message */}
        {availability.message && (
          <div className="flex items-center gap-2 text-sm">
            {getAvailabilityIcon()}
            <span className={
              availability.available === true ? 'text-green-700' :
              availability.available === false ? 'text-red-700' : 'text-gray-600'
            }>
              {availability.message}
            </span>
          </div>
        )}

        {/* Help Text */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Info className="h-3 w-3" />
          <span>Format: EMP001, EMP002, etc. Click the wand to auto-generate.</span>
        </div>

        {/* Debug Info - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
            Debug: API calls go to /api/v1/employee-id/generate
          </div>
        )}
      </div>

      {/* Preview Available IDs */}
      {showPreview && nextIds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-900">Next Available IDs</h4>
              <div className="grid grid-cols-2 gap-2">
                {nextIds.map((id) => (
                  <div
                    key={id}
                    className="flex items-center justify-between p-2 bg-white rounded border border-blue-200 hover:border-blue-300 cursor-pointer transition-colors"
                    onClick={() => handleSelectId(id)}
                  >
                    <span className="text-sm font-mono text-gray-900">{id}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-blue-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(id)
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-blue-700">Click on an ID to select it</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}