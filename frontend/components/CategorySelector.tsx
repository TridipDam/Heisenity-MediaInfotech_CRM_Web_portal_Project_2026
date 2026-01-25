"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Loader2 } from "lucide-react"
import { showToast } from "@/lib/toast-utils"
import { useAuthenticatedFetch } from "@/hooks/useAuthenticatedFetch"

interface Category {
  id: string
  name: string
  description?: string
  isActive: boolean
  _count?: {
    tickets: number
  }
}

interface CategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function CategorySelector({ value, onValueChange, placeholder = "Select category", disabled = false }: CategorySelectorProps) {
  const [categories, setCategories] = React.useState<Category[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false)
  const [newCategory, setNewCategory] = React.useState({
    name: "",
    description: ""
  })
  const [creating, setCreating] = React.useState(false)
  const { authenticatedFetch } = useAuthenticatedFetch()

  const fetchCategories = React.useCallback(async () => {
    try {
      setLoading(true)
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ticket-categories`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch problem types')
      }

      const data = await response.json()
      if (data.success) {
        setCategories(data.data)
      }
    } catch (error) {
      console.error('Error fetching problem types:', error)
      showToast.error('Failed to load problem types')
    } finally {
      setLoading(false)
    }
  }, [authenticatedFetch])

  React.useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      showToast.error('Problem type name is required')
      return
    }

    try {
      setCreating(true)
      const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/ticket-categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newCategory.name.trim(),
          description: newCategory.description.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create problem type')
      }

      const data = await response.json()
      if (data.success) {
        showToast.success('Problem type created successfully')
        setCategories(prev => [...prev, data.data])
        setNewCategory({ name: "", description: "" })
        setIsAddDialogOpen(false)
        
        // Auto-select the newly created category
        onValueChange(data.data.id)
      }
    } catch (error) {
      console.error('Error creating problem type:', error)
      showToast.error(error instanceof Error ? error.message : 'Failed to create problem type')
    } finally {
      setCreating(false)
    }
  }

  const handleDialogClose = () => {
    setIsAddDialogOpen(false)
    setNewCategory({ name: "", description: "" })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">
          <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
            <SelectTrigger>
              <SelectValue placeholder={loading ? "Loading problem types..." : placeholder} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{category.name}</span>
                    {category._count && category._count.tickets > 0 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({category._count.tickets} tickets)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              type="button" 
              variant="outline" 
              size="icon"
              disabled={disabled}
              title="Add new problem type"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add New Problem Type</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Problem Type Name *</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., MOBILE_ISSUES"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                  disabled={creating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-description">Description (Optional)</Label>
                <Textarea
                  id="category-description"
                  placeholder="Brief description of this problem type"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory(prev => ({ ...prev, description: e.target.value }))}
                  disabled={creating}
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDialogClose}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleCreateCategory}
                disabled={creating || !newCategory.name.trim()}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Problem Type
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}