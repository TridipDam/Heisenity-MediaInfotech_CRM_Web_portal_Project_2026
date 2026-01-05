"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  User, 
  Plus, 
  Loader2, 
  CheckCircle
} from "lucide-react"
import { 
  getAllFieldEngineers, 
  getFieldEngineerByEmployeeId,
  createFieldEngineer,
  FieldEngineer 
} from "@/lib/server-api"
import { EmployeeIdGenerator } from "@/components/EmployeeIdGenerator"

interface EmployeeSelectorProps {
  selectedEmployeeId: string
  onEmployeeChange: (employeeId: string) => void
  disabled?: boolean
}

export function EmployeeSelector({ 
  selectedEmployeeId, 
  onEmployeeChange, 
  disabled 
}: EmployeeSelectorProps) {
  const [fieldEngineers, setFieldEngineers] = React.useState<FieldEngineer[]>([])
  const [loading, setLoading] = React.useState(false)
  const [showAddForm, setShowAddForm] = React.useState(false)
  const [addingEmployee, setAddingEmployee] = React.useState(false)
  
  const [newEmployee, setNewEmployee] = React.useState({
    name: '',
    employeeId: '',
    email: '',
    password: '',
    phone: '',
    isTeamLeader: false
  })

  // Load field engineers on component mount
  React.useEffect(() => {
    loadFieldEngineers()
  }, [])

  const loadFieldEngineers = async () => {
    setLoading(true)
    try {
      const response = await getAllFieldEngineers({ status: 'ACTIVE' })
      if (response.success && response.data) {
        setFieldEngineers(response.data.fieldEngineers)
      }
    } catch (error) {
      console.error('Error loading field engineers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleEmployeeSelect = (employeeId: string) => {
    onEmployeeChange(employeeId)
  }

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.employeeId || !newEmployee.email || !newEmployee.password) {
      return
    }

    setAddingEmployee(true)
    try {
      const response = await createFieldEngineer({
        name: newEmployee.name,
        employeeId: newEmployee.employeeId,
        email: newEmployee.email,
        password: newEmployee.password,
        phone: newEmployee.phone || undefined,
        isTeamLeader: newEmployee.isTeamLeader
      })

      if (response.success && response.data) {
        // Add to local list
        setFieldEngineers(prev => [...prev, response.data!])
        
        // Select the new employee
        onEmployeeChange(response.data.employeeId)
        
        // Reset form
        setNewEmployee({
          name: '',
          employeeId: '',
          email: '',
          password: '',
          phone: '',
          isTeamLeader: false
        })
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Error adding employee:', error)
    } finally {
      setAddingEmployee(false)
    }
  }

  const filteredEmployees = fieldEngineers.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Employee Selection */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-50 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            Employee Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Employee ID Generator - Only Method */}
          <EmployeeIdGenerator
            value={selectedEmployeeId}
            onChange={(value) => onEmployeeChange(value, '')}
            disabled={disabled}
          />

          {/* Add New Employee Button */}
          <div className="flex justify-between items-center pt-2">
            <div className="text-sm text-gray-500">
              Need to register a new employee?
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddForm(!showAddForm)}
              disabled={disabled}
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Employee
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add New Employee Form */}
      {showAddForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-green-900">
              <Plus className="h-5 w-5" />
              Add New Field Engineer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Employee ID <span className="text-red-500">*</span>
                </Label>
                <EmployeeIdGenerator
                  value={newEmployee.employeeId}
                  onChange={(value) => setNewEmployee(prev => ({ ...prev, employeeId: value }))}
                  disabled={addingEmployee}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="employee@company.com"
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Enter password"
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Phone (Optional)
                </Label>
                <Input
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Phone number"
                  className="border-green-300 focus:border-green-500 focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-green-800">
                  Role
                </Label>
                <Select 
                  value={newEmployee.isTeamLeader ? 'leader' : 'engineer'} 
                  onValueChange={(value) => setNewEmployee(prev => ({ ...prev, isTeamLeader: value === 'leader' }))}
                >
                  <SelectTrigger className="border-green-300 focus:border-green-500 focus:ring-green-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineer">Field Engineer</SelectItem>
                    <SelectItem value="leader">Team Leader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddForm(false)}
                className="flex-1 border-green-300 hover:bg-green-100"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleAddEmployee}
                disabled={addingEmployee || !newEmployee.name || !newEmployee.employeeId || !newEmployee.email || !newEmployee.password}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {addingEmployee ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Add Employee
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Employee Preview */}
      {selectedEmployeeId && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {selectedEmployeeId.slice(-3)}
              </div>
              <div>
                <h4 className="font-semibold text-blue-900">Employee Selected</h4>
                <p className="text-sm text-blue-700">Employee ID: {selectedEmployeeId}</p>
              </div>
              <CheckCircle className="h-5 w-5 text-blue-600 ml-auto" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}