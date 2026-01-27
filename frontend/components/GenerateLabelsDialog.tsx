"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { 
  Package, 
  Download, 
  Loader2,
  Plus,
  Settings
} from "lucide-react"

interface Product {
  id: string
  sku: string
  productName: string
  description?: string
  boxQty: number
  totalUnits: number
}

interface GenerateLabelsDialogProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function GenerateLabelsDialog({ product, isOpen, onClose }: GenerateLabelsDialogProps) {
  const [count, setCount] = React.useState("1")
  const [prefix, setPrefix] = React.useState("")
  const [customPrefix, setCustomPrefix] = React.useState("")
  const [showCustomPrefix, setShowCustomPrefix] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [savedPrefixes, setSavedPrefixes] = React.useState<string[]>([])
  const { toast } = useToast()
  const { data: session } = useSession()

  // Default prefixes
  const defaultPrefixes = ["BX", "PKG", "ITM", "PRD", "BOX"]

  // Load saved preferences on component mount and set default count to product's boxQty
  React.useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Set count to product's box quantity when dialog opens, but cap at 10
        if (product) {
          const defaultCount = Math.min(product.boxQty, 10)
          setCount(defaultCount.toString())
        }

        // Load saved prefixes from localStorage
        const saved = localStorage.getItem('barcode_prefixes')
        if (saved) {
          const parsedPrefixes = JSON.parse(saved)
          setSavedPrefixes(parsedPrefixes)
        }

        // Optionally fetch server-managed prefixes (for admin-managed prefixes)
        try {
          const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
          const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
          const response = await fetch(`${backendUrl}/products/barcode-prefixes/list`, {
            headers: {
              'Authorization': `Bearer ${sessionToken}`,
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.data.customPrefixes) {
              // Merge server prefixes with local ones
              const serverPrefixes = data.data.customPrefixes
              const localPrefixes = saved ? JSON.parse(saved) : []
              const mergedPrefixes = [...new Set([...localPrefixes, ...serverPrefixes])]
              setSavedPrefixes(mergedPrefixes)
              // Update localStorage with merged prefixes
              localStorage.setItem('barcode_prefixes', JSON.stringify(mergedPrefixes))
            }
          }
        } catch (serverError) {
          console.log('Could not fetch server prefixes, using local only:', serverError)
        }

        // Load last used prefix
        const lastPrefix = localStorage.getItem('last_barcode_prefix')
        if (lastPrefix) {
          setPrefix(lastPrefix)
        } else {
          setPrefix("BX") // Default
        }
      } catch (error) {
        console.error('Error loading preferences:', error)
        setPrefix("BX")
      }
    }

    if (isOpen) {
      loadPreferences()
    }
  }, [isOpen, session, product])

  // Save preferences
  const savePreferences = (newPrefix: string) => {
    try {
      // Save last used prefix
      localStorage.setItem('last_barcode_prefix', newPrefix)

      // Add to saved prefixes if it's custom and not already saved
      const allPrefixes = [...defaultPrefixes, ...savedPrefixes]
      if (!allPrefixes.includes(newPrefix) && newPrefix.trim()) {
        const updatedPrefixes = [...savedPrefixes, newPrefix]
        setSavedPrefixes(updatedPrefixes)
        localStorage.setItem('barcode_prefixes', JSON.stringify(updatedPrefixes))
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
    }
  }

  const handleAddCustomPrefix = () => {
    if (!customPrefix.trim()) {
      toast({
        title: "Invalid Prefix",
        description: "Please enter a valid prefix",
        variant: "destructive"
      })
      return
    }

    const newPrefix = customPrefix.trim().toUpperCase()
    
    // Validate prefix (2-4 characters, letters only)
    if (!/^[A-Z]{2,4}$/.test(newPrefix)) {
      toast({
        title: "Invalid Prefix",
        description: "Prefix must be 2-4 uppercase letters only",
        variant: "destructive"
      })
      return
    }

    const allPrefixes = [...defaultPrefixes, ...savedPrefixes]
    if (allPrefixes.includes(newPrefix)) {
      toast({
        title: "Prefix Exists",
        description: "This prefix already exists",
        variant: "destructive"
      })
      return
    }

    // Add to saved prefixes
    const updatedPrefixes = [...savedPrefixes, newPrefix]
    setSavedPrefixes(updatedPrefixes)
    localStorage.setItem('barcode_prefixes', JSON.stringify(updatedPrefixes))
    
    // Set as current prefix
    setPrefix(newPrefix)
    setCustomPrefix("")
    setShowCustomPrefix(false)

    toast({
      title: "Success",
      description: `Added custom prefix: ${newPrefix}`
    })
  }

  const handleGenerate = async () => {
    if (!product) return

    try {
      setIsGenerating(true)

      // Validate inputs
      const labelCount = parseInt(count)
      if (isNaN(labelCount) || labelCount < 1 || labelCount > 10) {
        toast({
          title: "Invalid Count",
          description: "Please enter a number between 1 and 10",
          variant: "destructive"
        })
        return
      }

      if (!prefix.trim()) {
        toast({
          title: "Invalid Prefix",
          description: "Please select or enter a valid prefix",
          variant: "destructive"
        })
        return
      }

      // Save preferences before generating
      savePreferences(prefix)

      // Call the backend API to generate labels
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken
      const response = await fetch(`${backendUrl}/products/${product.id}/generate-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          count: labelCount,
          prefix: prefix.trim()
        })
      })

      if (response.ok) {
        // The response should be a PDF file
        const blob = await response.blob()
        
        // Create a download link
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `labels_${product.sku}_${prefix}_${Date.now()}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Success",
          description: `Generated ${labelCount} labels with prefix "${prefix}" for ${product.productName}`
        })

        onClose()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate labels')
      }
    } catch (error: unknown) {
      console.error('Error generating labels:', error)
      const errorMessage = error instanceof Error ? error.message : "Failed to generate labels"
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      // Reset count to product's boxQty when closing, but cap at 10
      const defaultCount = product ? Math.min(product.boxQty, 10) : 1
      setCount(defaultCount.toString())
      setCustomPrefix("")
      setShowCustomPrefix(false)
      onClose()
    }
  }

  if (!product) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Generate Labels
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{product.productName}</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><span className="font-medium">SKU:</span> {product.sku}</p>
              <p><span className="font-medium">Box Quantity:</span> {product.boxQty} units</p>
              {product.description && (
                <p><span className="font-medium">Description:</span> {product.description}</p>
              )}
            </div>
          </div>

          {/* Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="count">Number of Labels *</Label>
                <Input
                  id="count"
                  type="number"
                  value={count}
                  onChange={(e) => setCount(e.target.value)}
                  placeholder={product ? product.boxQty.toString() : "1"}
                  min="1"
                  max="10"
                  required
                />
                <p className="text-xs text-gray-500">
                  Default: {product ? Math.min(product.boxQty, 10) : 1} 
                  {product && product.boxQty > 10 && (
                    <span className="text-amber-600"> (capped from {product.boxQty})</span>
                  )} • Max: 10 labels
                </p>
                {product && product.boxQty > 10 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 mt-1">
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> Your box quantity is {product.boxQty}, but we've limited to 10 labels for optimal performance. 
                      Generate multiple batches if you need more labels.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Barcode Prefix *</Label>
                <div className="flex gap-2">
                  <Select value={prefix} onValueChange={setPrefix}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select prefix" />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Default prefixes */}
                      {defaultPrefixes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p} (Default)
                        </SelectItem>
                      ))}
                      {/* Saved custom prefixes */}
                      {savedPrefixes.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p} (Custom)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomPrefix(!showCustomPrefix)}
                    title="Add custom prefix"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {prefix && (
                  <p className="text-xs text-gray-500">
                    Preview: {prefix}001, {prefix}002, {prefix}003...
                  </p>
                )}
              </div>
            </div>

            {/* Custom Prefix Input */}
            {showCustomPrefix && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-medium text-blue-900">Add Custom Prefix</Label>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toUpperCase())}
                    placeholder="e.g., CUST, SPEC"
                    maxLength={4}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddCustomPrefix}
                    disabled={!customPrefix.trim()}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCustomPrefix(false)
                      setCustomPrefix("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  Enter 2-4 uppercase letters. This will be saved for future use.
                </p>
              </div>
            )}

            <div className="text-xs text-gray-500 space-y-1">
              <p>• Labels will be generated as a PDF file</p>
              <p>• Each label includes barcode, SKU, product name, and box quantity</p>
              <p>• Your selected prefix will be remembered for next time</p>
              <p>• Maximum 10 labels per generation (for optimal performance)</p>
              <p>• For larger quantities, generate multiple batches</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generate & Download
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}