"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { QrCode, Camera, Package } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface QRScannerProps {
  onScan?: (data: string) => void
}

interface ProductInfo {
  id: string
  name: string
  category: string
  stock: number
  price: string
  location: string
}

export function QRScanner({ onScan }: QRScannerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [isScanning, setIsScanning] = React.useState(false)
  const [scannedData, setScannedData] = React.useState<string | null>(null)
  const [productInfo, setProductInfo] = React.useState<ProductInfo | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)

  const startCamera = async () => {
    try {
      setIsScanning(true)
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera if available
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (error) {
      console.error('Error accessing camera:', error)
      setIsScanning(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const handleScan = () => {
    // Simulate QR code scanning with mock product data
    const mockProductData = "PROD-" + Math.random().toString(36).substring(2, 11).toUpperCase()
    const mockProductInfo: ProductInfo = {
      id: mockProductData,
      name: "Sample Product " + Math.floor(Math.random() * 100),
      category: "Electronics",
      stock: Math.floor(Math.random() * 50) + 1,
      price: "₹" + (Math.random() * 1000 + 100).toFixed(2),
      location: "Warehouse A-" + Math.floor(Math.random() * 10 + 1)
    }
    
    setScannedData(mockProductData)
    setProductInfo(mockProductInfo)
    onScan?.(mockProductData)
    stopCamera()
  }

  const handleClose = () => {
    handleOpen(false)
  }

  const handleOpen = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      stopCamera()
      setScannedData(null)
      setProductInfo(null)
    }
  }

  React.useEffect(() => {
    if (isOpen && !scannedData) {
      startCamera()
    }
  }, [isOpen, scannedData])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  return (
    <Sheet open={isOpen} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="icon"
          className="relative hover:bg-blue-50 hover:border-blue-200 transition-colors"
          title="Scan Product QR Code"
        >
          <QrCode className="h-4 w-4 text-blue-600" />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-blue-600" />
            Product Scanner
          </SheetTitle>
        </SheetHeader>

        <div className="px-6 py-4 space-y-6">
          {!scannedData ? (
            <>
              <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-square max-w-sm mx-auto">
                {isScanning ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center text-white space-y-3">
                      <Camera className="h-12 w-12 mx-auto opacity-50" />
                      <p className="text-sm opacity-75">Camera loading...</p>
                    </div>
                  </div>
                )}
                
                {/* Scanning overlay */}
                <div className="absolute inset-4">
                  <div className="relative w-full h-full border-2 border-blue-400 rounded-lg">
                    {/* Corner indicators */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                    
                    {/* Center crosshair */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <div className="w-8 h-0.5 bg-blue-400"></div>
                      <div className="w-0.5 h-8 bg-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-medium">
                    Position QR code within the frame
                  </p>
                  <p className="text-xs text-gray-500">
                    Make sure the code is clearly visible and well-lit
                  </p>
                </div>
                <Button 
                  onClick={handleScan}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!isScanning}
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  {isScanning ? "Simulate Scan" : "Starting Camera..."}
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-6">
              <div className="text-center p-6 bg-green-50 rounded-xl border border-green-200">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-green-900 mb-2 text-lg">Scan Successful!</h3>
                <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 px-3 py-1">
                  {scannedData}
                </Badge>
              </div>
                
              {productInfo && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">Product Details</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-600 font-medium">Product:</span>
                      <span className="font-semibold text-gray-900">{productInfo.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">Category:</span>
                      <span className="font-medium text-gray-700">{productInfo.category}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">Stock:</span>
                      <Badge variant={productInfo.stock > 10 ? "secondary" : "destructive"} className="font-medium">
                        {productInfo.stock} units
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">Price:</span>
                      <span className="font-semibold text-green-600 text-lg">{productInfo.price}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-600 font-medium">Location:</span>
                      <span className="font-medium text-blue-600">{productInfo.location}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2">
                <Button 
                  onClick={() => {
                    setScannedData(null)
                    setProductInfo(null)
                    startCamera()
                  }}
                  variant="outline"
                  className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Scan Another Product
                </Button>
                <Button 
                  onClick={handleClose}
                  className="w-full bg-gray-900 hover:bg-gray-800"
                  size="lg"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}