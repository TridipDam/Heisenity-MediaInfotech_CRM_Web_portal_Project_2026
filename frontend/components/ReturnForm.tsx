"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { getEmployeeCheckouts, createInventoryTransaction } from "@/lib/server-api"
import { 
  Package, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle,
  Clock,
  User,
  Minus,
  Plus
} from "lucide-react"

interface CheckoutItem {
  id: string;
  checkoutTime: string;
  barcode: {
    id: string;
    barcodeValue: string;
    serialNumber: string;
    boxQty: number;
    status: string;
    product: {
      id: string;
      sku: string;
      productName: string;
      description?: string;
    } | null;
  };
}

interface ReturnQuantity {
  checkoutId: string;
  barcodeId: string;
  productId: string;
  quantity: number;
  maxQuantity: number;
}

interface ReturnFormProps {
  employeeId?: string;
  onReturnComplete?: () => void;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ReturnForm({ employeeId, onReturnComplete, isOpen: externalIsOpen, onOpenChange }: ReturnFormProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [checkouts, setCheckouts] = React.useState<CheckoutItem[]>([]);
  // don't prefill with zeros — treat a key being present as "selected for return"
  const [returnQuantities, setReturnQuantities] = React.useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = React.useState(false);
  const [isReturning, setIsReturning] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);

  // Use external control if provided
  const dialogOpen = externalIsOpen !== undefined ? externalIsOpen : isOpen;
  const setDialogOpen = onOpenChange || setIsOpen;

  // Get employee ID from session if not provided
  const currentEmployeeId = employeeId || (session as { user?: { id?: string } })?.user?.id;

  const fetchCheckouts = React.useCallback(async () => {
    if (!currentEmployeeId) return;

    try {
      setIsLoading(true);
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;
      const response = await getEmployeeCheckouts(currentEmployeeId, sessionToken);
      
      if (response.success && response.data) {
        setCheckouts(response.data.checkouts);
        // DO NOT initialize returnQuantities to 0 here.
        // We want staff to actively select items (including entering 0) to mark them for return.
        setReturnQuantities({});
      } else {
        throw new Error(response.error || 'Failed to fetch checkouts');
      }
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      toast({
        title: "Error",
        description: "Failed to load your checked-out items",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentEmployeeId, session, toast]);

  React.useEffect(() => {
    if (dialogOpen && currentEmployeeId) {
      fetchCheckouts();
    }
  }, [dialogOpen, currentEmployeeId, fetchCheckouts]);

  const updateQuantity = (checkoutId: string, newQuantity: number) => {
    const checkout = checkouts.find(c => c.id === checkoutId);
    if (!checkout) return;

    // Ensure quantity is within valid range (0 to boxQty)
    const clampedQuantity = Math.max(0, Math.min(newQuantity, checkout.barcode.boxQty));
    
    setReturnQuantities(prev => ({
      ...prev,
      [checkoutId]: clampedQuantity
    }));
  };

  const handleReturn = async () => {
    if (!currentEmployeeId) {
      toast({
        title: "Error",
        description: "Employee ID not found",
        variant: "destructive"
      });
      return;
    }

    // Items selected for return = those where the user interacted with the quantity input
    const itemsToReturn = checkouts.filter(checkout =>
      Object.prototype.hasOwnProperty.call(returnQuantities, checkout.id)
    );

    if (itemsToReturn.length === 0) {
      toast({
        title: "No Items to Return",
        description: "Please specify quantities (including 0) for items you want to return",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsReturning(true);
      const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;

      if (!sessionToken) {
        toast({
          title: "Authentication Error",
          description: "Session token not found. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      // Process returns for items with quantities (can be 0)
      const returnPromises = itemsToReturn.map(async (checkout) => {
        const usedQuantity = returnQuantities[checkout.id] ?? 0;
        const returnToInventory = Math.max(0, checkout.barcode.boxQty - usedQuantity);
        
        return createInventoryTransaction({
          productId: checkout.barcode.product?.id || '',
          barcodeId: checkout.barcode.id,
          employeeId: currentEmployeeId,
          transactionType: 'RETURN',
          usedQty: usedQuantity, // What employee actually used (can be 0)
          remarks: `Used: ${usedQuantity}, Returned to inventory: ${returnToInventory} out of ${checkout.barcode.boxQty} total`
        }, sessionToken);
      });

      const results = await Promise.all(returnPromises);
      const successCount = results.filter(r => r?.success).length;
      const failCount = results.length - successCount;

      // Check for authentication errors
      const authErrors = results.filter(r => (r?.error && String(r.error).toLowerCase().includes('token')) || (r?.message && String(r.message).toLowerCase().includes('token')));
      if (authErrors.length > 0) {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive"
        });
        return;
      }

      if (successCount > 0) {
        const totalUsed = itemsToReturn.reduce((sum, checkout) => 
          sum + (returnQuantities[checkout.id] ?? 0), 0
        );
        const totalReturned = itemsToReturn.reduce((sum, checkout) => 
          sum + Math.max(0, checkout.barcode.boxQty - (returnQuantities[checkout.id] ?? 0)), 0
        );

        toast({
          title: "Return Processed",
          description: `Used: ${totalUsed} items, Returned: ${totalReturned} items to inventory${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });

        // Refresh the list
        await fetchCheckouts();
        onReturnComplete?.();
      } else {
        throw new Error('All returns failed');
      }

    } catch (error) {
      console.error('Error returning items:', error);
      toast({
        title: "Return Failed",
        description: "Failed to return selected items",
        variant: "destructive"
      });
    } finally {
      setIsReturning(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Show number of selected items (not sum of used quantities)
  const getSelectedCount = () => {
    return Object.keys(returnQuantities).length;
  };

  if (!currentEmployeeId) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Return Items
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Please log in to view your checked-out items.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Return Items
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Checked-Out Items
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Header Actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Employee: {currentEmployeeId}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchCheckouts}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              
              {getSelectedCount() > 0 && (
                <Button
                  onClick={handleReturn}
                  disabled={isReturning}
                  className="gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Process Return
                  {isReturning && <RefreshCw className="h-4 w-4 animate-spin" />}
                </Button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                Loading your checked-out items...
              </div>
            ) : checkouts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Items Checked Out
                </h3>
                <p className="text-gray-500">
                  You don't have any items currently checked out.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Items List */}
                <div className="space-y-3">
                  {checkouts.map((checkout) => {
                    const currentQty = returnQuantities[checkout.id] ?? 0;
                    return (
                      <Card key={checkout.id} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                          {/* Product Info */}
                          <div className="md:col-span-2">
                            <div className="font-medium text-sm">
                              {checkout.barcode.product?.productName || 'Unknown Product'}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              SKU: {checkout.barcode.product?.sku || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500">
                              Serial: {checkout.barcode.serialNumber}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Clock className="h-3 w-3" />
                              Checked out: {formatDate(checkout.checkoutTime)}
                            </div>
                          </div>
                          
                          {/* Used Quantity Input */}
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`qty-${checkout.id}`} className="text-xs whitespace-nowrap">
                              Used:
                            </Label>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuantity(checkout.id, (returnQuantities[checkout.id] ?? 0) - 1)}
                                disabled={(returnQuantities[checkout.id] ?? 0) <= 0}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              
                              <Input
                                id={`qty-${checkout.id}`}
                                type="number"
                                min={0}
                                max={checkout.barcode.boxQty}
                                value={currentQty}
                                onChange={(e) => {
                                  const parsed = parseInt(e.target.value, 10);
                                  updateQuantity(checkout.id, Number.isNaN(parsed) ? 0 : parsed);
                                }}
                                className="w-16 h-8 text-center text-sm"
                                placeholder="0"
                              />
                              
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuantity(checkout.id, (returnQuantities[checkout.id] ?? 0) + 1)}
                                disabled={(returnQuantities[checkout.id] ?? 0) >= checkout.barcode.boxQty}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="text-xs text-gray-500">
                              Return: {checkout.barcode.boxQty - (currentQty)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
