"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { 
  Package, 
  Download, 
  Loader2,
  FileText,
  Printer
} from "lucide-react"

interface Product {
  id: string
  sku: string
  productName: string
  description?: string
  boxQty: number
  totalUnits: number
  reorderThreshold: number
}

interface GenerateLabelsDialogProps {
  product: Product | null
  isOpen: boolean
  onClose: () => void
}

export function GenerateLabelsDialog({ product, isOpen, onClose }: GenerateLabelsDialogProps) {
  const [count, setCount] = React.useState("1")
  const [prefix, setPrefix] = React.useState("BX")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const { toast } = useToast()
  const { data: session } = useSession()

  const handleGenerate = async () => {
    if (!product) return

    try {
      setIsGenerating(true)

      // Validate inputs
      const labelCount = parseInt(count)
      if (isNaN(labelCount) || labelCount < 1 || labelCount > 100) {
        toast({
          title: "Invalid Count",
          description: "Please enter a number between 1 and 100",
          variant: "destructive"
        })
        return
      }

      if (!prefix.trim()) {
        toast({
          title: "Invalid Prefix",
          description: "Please enter a valid prefix",
          variant: "destructive"
        })
        return
      }

      // Call the backend API to generate labels
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'
      const response = await fetch(`${backendUrl}/products/${product.id}/generate-labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(session as any)?.user?.sessionToken}`,
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
        link.download = `labels_${product.sku}_${Date.now()}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast({
          title: "Success",
          description: `Generated ${labelCount} labels for ${product.productName}`
        })

        onClose()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate labels')
      }
    } catch (error: any) {
      console.error('Error generating labels:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate labels",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleClose = () => {
    if (!isGenerating) {
      setCount("1")
      setPrefix("BX")
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
                  placeholder="1"
                  min="1"
                  max="100"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prefix">Barcode Prefix</Label>
                <Input
                  id="prefix"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                  placeholder="BX"
                  maxLength={4}
                />
              </div>
            </div>

            <div className="text-xs text-gray-500">
              <p>• Labels will be generated as a PDF file</p>
              <p>• Each label includes barcode, SKU, product name, and box quantity</p>
              <p>• Maximum 100 labels per generation</p>
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