"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"

interface InventoryStatusProps {
  totalUnits: number
  availableUnits: number
  reorderThreshold?: number
  showProgressBar?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function InventoryStatus({ 
  totalUnits, 
  availableUnits, 
  reorderThreshold = 10,
  showProgressBar = true,
  size = 'md'
}: InventoryStatusProps) {
  const getStockStatus = () => {
    if (availableUnits === 0) return "out_of_stock"
    if (availableUnits <= reorderThreshold) return "low_stock"
    return "in_stock"
  }

  const status = getStockStatus()
  
  const statusConfig = {
    out_of_stock: {
      label: "Out of Stock",
      color: "bg-red-500",
      badgeVariant: "destructive" as const,
      textColor: "text-red-600"
    },
    low_stock: {
      label: "Low Stock",
      color: "bg-amber-500",
      badgeVariant: "secondary" as const,
      textColor: "text-amber-600"
    },
    in_stock: {
      label: "In Stock",
      color: "bg-green-500",
      badgeVariant: "default" as const,
      textColor: "text-green-600"
    }
  }

  const config = statusConfig[status]
  const percentage = Math.min((availableUnits / Math.max(totalUnits, 1)) * 100, 100)

  const sizeClasses = {
    sm: {
      text: "text-xs",
      badge: "text-xs px-2 py-1",
      progressHeight: "h-1"
    },
    md: {
      text: "text-sm",
      badge: "text-xs px-2 py-1",
      progressHeight: "h-2"
    },
    lg: {
      text: "text-base",
      badge: "text-sm px-3 py-1",
      progressHeight: "h-3"
    }
  }

  const classes = sizeClasses[size]

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className={`font-semibold ${classes.text}`}>
          {availableUnits} / {totalUnits}
        </div>
        <Badge variant={config.badgeVariant} className={classes.badge}>
          {config.label}
        </Badge>
      </div>
      
      <div className={`text-xs text-gray-500 ${classes.text}`}>
        Available / Total
      </div>
      
      {showProgressBar && (
        <div className="w-full bg-gray-200 rounded-full">
          <div 
            className={`${classes.progressHeight} rounded-full ${config.color} transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      
      {availableUnits <= reorderThreshold && availableUnits > 0 && (
        <div className={`text-xs ${config.textColor} font-medium`}>
          Reorder recommended (threshold: {reorderThreshold})
        </div>
      )}
    </div>
  )
}