"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { z } from "zod"


const StockItemSchema = z
  .object({
    sku: z.string().optional(),
    productName: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    boxQty: z.coerce.number().int().min(0, "Units per box cannot be negative"),
    totalUnits: z.coerce.number().int().min(0, "Total units cannot be negative"),
    unitPrice: z.coerce.number().min(0, "Unit price cannot be negative").optional(),
    supplier: z.string().optional(),
    status: z.enum(["ACTIVE", "INACTIVE", "DISCONTINUED", "OUT_OF_STOCK"]).default("ACTIVE"),
  })


type StockItemFormState = {
  sku: string
  productName: string
  description: string
  boxQty: string
  totalUnits: string
  unitPrice: string
  supplier: string
  status: string
}

type FormErrors = Partial<Record<keyof StockItemFormState, string>>

interface AddNewStockItemProps {
  onSuccess?: () => void
}

export default function AddStockItem({ onSuccess }: AddNewStockItemProps): React.JSX.Element {
  const [form, setForm] = React.useState<StockItemFormState>({
    sku: "",
    productName: "",
    description: "",
    boxQty: "0",
    totalUnits: "0",
    unitPrice: "",
    supplier: "",
    status: "ACTIVE",
  })

  const [errors, setErrors] = React.useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const { toast } = useToast()

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ): void => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const onSubmit = async (): Promise<void> => {
    const parsed = StockItemSchema.safeParse(form)

    if (!parsed.success) {
      const nextErrors: FormErrors = {}

      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof StockItemFormState | undefined
        if (field) nextErrors[field] = issue.message
      })

      setErrors(nextErrors)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(parsed.data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create product')
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: "Stock item created successfully",
      })

      // Reset form
      setForm({
        sku: "",
        productName: "",
        description: "",
        boxQty: "0",
        totalUnits: "0",
        unitPrice: "",
        supplier: "",
        status: "ACTIVE",
      })

      // Call success callback
      onSuccess?.()

    } catch (error) {
      console.error('Error creating product:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create stock item",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form */}
      <div className="lg:col-span-2 space-y-6">
        {/* Identification */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            <h3 className="font-semibold">Identification</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                SKU <span className="text-xs text-gray-400">(optional)</span>
              </Label>
              <Input
                name="sku"
                placeholder="e.g. CAM-X1-4K"
                value={form.sku}
                onChange={onChange}
              />
              {errors.sku && (
                <p className="text-xs text-red-600">{errors.sku}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input
                name="productName"
                placeholder="e.g. 4K Security Camera"
                value={form.productName}
                onChange={onChange}
              />
              {errors.productName && (
                <p className="text-xs text-red-600">{errors.productName}</p>
              )}
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="space-y-2">
          <Label>Description</Label>
          <Textarea
            name="description"
            placeholder="Short functional description, specs, or usage notes"
            value={form.description}
            onChange={onChange}
          />
          {errors.description && (
            <p className="text-xs text-red-600">{errors.description}</p>
          )}
        </section>

        {/* Stock Configuration */}
        <section className="space-y-4">
          <h3 className="font-semibold">Stock Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Units per Box</Label>
              <Input
                type="number"
                min={0}
                name="boxQty"
                placeholder="e.g. 10"
                value={form.boxQty}
                onChange={onChange}
              />
              {errors.boxQty && (
                <p className="text-xs text-red-600">{errors.boxQty}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Total Units</Label>
              <Input
                type="number"
                min={0}
                name="totalUnits"
                placeholder="e.g. 250"
                value={form.totalUnits}
                onChange={onChange}
              />
              {errors.totalUnits && (
                <p className="text-xs text-red-600">{errors.totalUnits}</p>
              )}
            </div>
          </div>
        </section>

        {/* Pricing & Supplier */}
        <section className="space-y-4">
          <h3 className="font-semibold">Pricing & Supplier</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Unit Price</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                name="unitPrice"
                placeholder="e.g. 1299.99"
                value={form.unitPrice}
                onChange={onChange}
              />
              {errors.unitPrice && (
                <p className="text-xs text-red-600">{errors.unitPrice}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Input
                name="supplier"
                placeholder="e.g. TechSupply Co."
                value={form.supplier}
                onChange={onChange}
              />
              {errors.supplier && (
                <p className="text-xs text-red-600">{errors.supplier}</p>
              )}
            </div>
          </div>
        </section>

        {/* Status */}
        <section className="space-y-2">
          <Label>Status</Label>
          <select
            name="status"
            value={form.status}
            onChange={onChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="DISCONTINUED">Discontinued</option>
            <option value="OUT_OF_STOCK">Out of Stock</option>
          </select>
          {errors.status && (
            <p className="text-xs text-red-600">{errors.status}</p>
          )}
        </section>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6">
          <Button variant="outline" disabled={isSubmitting}>Cancel</Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700"
            onClick={onSubmit}
            disabled={isSubmitting}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? "Creating..." : "Create Item"}
          </Button>
        </div>
      </div>

      {/* Side Panel */}
      <div className="space-y-6">
        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-gray-600">
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">SKU</span>
              <span className="font-medium">{form.sku || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Units</span>
              <span className="font-medium">{form.totalUnits}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Units per Box</span>
              <span className="font-medium">{form.boxQty}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Unit Price</span>
              <span className="font-medium">{form.unitPrice ? `₹${form.unitPrice}` : "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Total Value</span>
              <span className="font-medium">
                {form.unitPrice && form.totalUnits ? 
                  `₹${(parseFloat(form.unitPrice) * parseInt(form.totalUnits || "0")).toFixed(2)}` : 
                  "—"
                }
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Supplier</span>
              <span className="font-medium">{form.supplier || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Status</span>
              <span className="font-medium">{form.status}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wide text-gray-600">
              Stock Management Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3 text-sm text-gray-600">
            <ul className="list-disc pl-4 space-y-2">
              <li>
                Set appropriate <strong>Units per Box</strong> based on your packaging standards.
              </li>
              <li>
                <strong>Total Units</strong> represents the current stock level in your inventory.
              </li>
              <li>
                Stock levels can be adjusted later using inventory transactions without modifying this master record.
              </li>
              <li>
                Use the stock management system to track inventory movements and maintain accurate counts.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
