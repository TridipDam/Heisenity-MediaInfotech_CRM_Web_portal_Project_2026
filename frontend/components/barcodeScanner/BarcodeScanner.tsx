'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ReturnForm } from '@/components/ReturnForm';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { QrCode, Package, AlertCircle, Camera } from 'lucide-react';

/* ...keep your interfaces and constants unchanged... */

interface BarcodeScannerProps {
  onScan?: (data: string) => void;
  onInventoryChange?: () => void;
  onScanResult?: (result: any) => void;
}

interface ProductResult {
  id: string;
  serialNumber: string;
  status: string;
  product: {
    id: string;
    productName: string;
    sku: string;
    boxQty: number;
  };
}

const SCANNER_ID = 'quagga-scanner';
const VALID_BARCODE_REGEX = /^BX\d{6}$/;
const CONSENSUS_REQUIRED = 3;
const CONSENSUS_WINDOW_MS = 1500;

export default function BarcodeScanner({ onScan, onInventoryChange, onScanResult }: BarcodeScannerProps) {
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<ProductResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showScanWarning, setShowScanWarning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [duplicateWarning, setDuplicateWarning] = useState<{ show: boolean; remaining: number; message?: string }>({
    show: false,
    remaining: 0,
    message: undefined
  });
  const [showReturnForm, setShowReturnForm] = useState(false);

  const quaggaRef = useRef<any | null>(null);
  const initializedRef = useRef(false);
  const processingRef = useRef(false);
  const lastScanRef = useRef(Date.now());
  const mountedRef = useRef(true);

  const recentDetections = useRef(new Map<string, { count: number; last: number }>());
  const warningTimerRef = useRef<number | null>(null);
  const duplicateTimerRef = useRef<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isOpen || initializedRef.current) return;

    let cancelled = false;
    let warningTimer: number | null = null;

    const startScanner = async () => {
      if (!mountedRef.current) return;

      setIsLoading(true);
      setCameraError(null);

      await new Promise(res => setTimeout(res, 350));
      if (cancelled || !mountedRef.current) return;

      try {
        initializedRef.current = true;

        const Quagga = (await import('@ericblade/quagga2')).default;
        quaggaRef.current = Quagga;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera not supported on this device');
        }

        Quagga.init(
          {
            inputStream: {
              type: 'LiveStream',
              target: `#${SCANNER_ID}`,
              constraints: {
                facingMode: 'environment',
                width: { ideal: 1280, min: 640 },
                height: { ideal: 720, min: 480 }
              }
            },
            decoder: {
              readers: ['code_128_reader']
            },
            locate: true,
            locator: {
              patchSize: 'medium',
              halfSample: true
            }
          },
          (err: Error | null) => {
            if (!mountedRef.current) return;

            if (err) {
              console.error('Quagga init error:', err);
              setCameraError(
                err.message.includes('Permission')
                  ? 'Camera permission denied. Please allow camera access and try again.'
                  : 'Unable to access camera. Please check your camera permissions.'
              );
              setIsLoading(false);
              return;
            }

            try {
              Quagga.start();
              setCameraError(null);
              setIsLoading(false);

              setTimeout(() => {
                if (!mountedRef.current) return;
                const video = document.querySelector(`#${SCANNER_ID} video`) as HTMLVideoElement | null;
                if (video) {
                  video.setAttribute('playsinline', 'true');
                  video.setAttribute('muted', 'true');
                  video.muted = true;
                  video.autoplay = true;
                  video.style.width = '100%';
                  video.style.height = '100%';
                  video.style.objectFit = 'contain';
                  video.play().catch(console.warn);
                }
              }, 200);
            } catch (startError) {
              console.error('Quagga start error:', startError);
              setCameraError('Failed to start camera. Please try again.');
              setIsLoading(false);
            }
          }
        );

        Quagga.onDetected(async (data: unknown) => {
          if (processingRef.current || cancelled || !mountedRef.current) return;

          const code = (data as { codeResult?: { code?: string } })?.codeResult?.code;
          if (!code || code.length < 3) return;

          if (!VALID_BARCODE_REGEX.test(code)) {
            lastScanRef.current = Date.now();
            return;
          }

          const now = Date.now();
          const map = recentDetections.current;
          const prev = map.get(code) ?? { count: 0, last: now };

          if (now - prev.last > CONSENSUS_WINDOW_MS) {
            prev.count = 0;
          }

          prev.count += 1;
          prev.last = now;
          map.set(code, prev);

          map.forEach((v, k) => {
            if (now - v.last > CONSENSUS_WINDOW_MS) {
              map.delete(k);
            }
          });

          if (prev.count < CONSENSUS_REQUIRED) {
            lastScanRef.current = now;
            return;
          }

          map.delete(code);

          processingRef.current = true;
          lastScanRef.current = Date.now();
          setShowScanWarning(false);
          setError(null);
          setDuplicateWarning({ show: false, remaining: 0, message: undefined });
          if (duplicateTimerRef.current) {
            window.clearInterval(duplicateTimerRef.current);
            duplicateTimerRef.current = null;
          }

          try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
            if (!backendUrl) {
              throw new Error('Backend URL not configured');
            }

            const sessionToken = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;
            if (!sessionToken) {
              throw new Error('Authentication required - please log in');
            }

            const fullUrl = `${backendUrl}/products/barcode/${encodeURIComponent(code)}`;
            const res = await fetch(fullUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`,
              },
            });

            if (!res.ok) {
              if (res.status === 404) {
                throw new Error('Barcode not found in inventory');
              }
              throw new Error(`Server error: ${res.status}`);
            }

            const json = await res.json();
            if (!mountedRef.current) return;

            if (json.success && json.data) {
              setResult(json.data);
              onScanResult?.(json.data);

              // treat any 'checked out' status from backend as trigger to show the return form
              const statusStr = String(json.data.status ?? '').trim().toLowerCase();
              const canReturn = Boolean(json.data?.canReturn);
              const remaining = Number(json.data?.returnRemainingSeconds ?? 0);

              if (statusStr === 'checked_out') {
                if (canReturn) {
                  processingRef.current = true;
                  setShowReturnForm(true);
                  return;
                } else {
                  // show a short UI notice (or start a countdown) instead of opening the form
                  setError(`Return not allowed yet — wait ${remaining}s before returning.`);
                  setTimeout(() => {
                    if (mountedRef.current) {
                      setError(null);
                      processingRef.current = false;
                    }
                  }, 5000);
                  return;
                }
              }

              // === end updated check ===

              // Create inventory transaction (original checkout flow)
              try {
                const sessionToken2 = (session as { user?: { sessionToken?: string } })?.user?.sessionToken;
                const employeeId = (session as { user?: { id?: string } })?.user?.id;

                if (!sessionToken2) {
                  console.warn('⚠️ No session token found, skipping transaction creation');
                  processingRef.current = false;
                  return;
                }

                if (employeeId) {
                  const barcodeId = json.data?.id;
                  const productId = json.data?.product?.id;

                  if (!barcodeId || !productId) {
                    console.warn('⚠️ Missing barcode ID or product ID from lookup result');
                    processingRef.current = false;
                    return;
                  }

                  const transactionResponse = await fetch(`${backendUrl}/products/transactions`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${sessionToken2}`,
                    },
                    body: JSON.stringify({
                      barcodeValue: code,
                      transactionType: 'CHECKOUT',
                      checkoutQty: 1,
                      employeeId: employeeId,
                      remarks: 'Barcode scanned via mobile scanner'
                    })
                  });

                  if (transactionResponse.status === 409) {
                    const dupJson = await transactionResponse.json().catch(() => ({}));
                    const remaining = typeof dupJson?.remainingSeconds === 'number' ? dupJson.remainingSeconds : (dupJson?.remainingSeconds ?? 0);
                    const message = dupJson?.message || 'Duplicate scan detected';

                    setDuplicateWarning({
                      show: true,
                      remaining: remaining || 5,
                      message: message
                    });

                    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
                      try { navigator.vibrate?.(200); } catch (e) { /* ignore */ }
                    }

                    if (duplicateTimerRef.current) {
                      window.clearInterval(duplicateTimerRef.current);
                      duplicateTimerRef.current = null;
                    }

                    duplicateTimerRef.current = window.setInterval(() => {
                      setDuplicateWarning(prev => {
                        if (!prev.show) {
                          if (duplicateTimerRef.current) {
                            window.clearInterval(duplicateTimerRef.current);
                            duplicateTimerRef.current = null;
                          }
                          return prev;
                        }
                        if (prev.remaining <= 1) {
                          if (duplicateTimerRef.current) {
                            window.clearInterval(duplicateTimerRef.current);
                            duplicateTimerRef.current = null;
                          }
                          return { show: false, remaining: 0, message: undefined };
                        }
                        return { ...prev, remaining: prev.remaining - 1 };
                      });
                    }, 1000);

                    processingRef.current = false;
                    return;
                  }

                  if (transactionResponse.ok) {
                    const transactionData = await transactionResponse.json();
                    if (transactionData.success) {
                      onInventoryChange?.();
                    } else {
                      console.warn('⚠️ Transaction creation failed:', transactionData.error);
                    }
                  } else {
                    const errorData = await transactionResponse.json().catch(() => ({}));
                    console.warn('⚠️ Failed to create transaction:', transactionResponse.status, errorData);
                  }
                } else {
                  console.warn('⚠️ No employee ID found in session, skipping transaction creation');
                }
              } catch (transactionError) {
                console.error('❌ Error creating transaction:', transactionError);
              }

              onScan?.(code);

              setTimeout(() => {
                if (mountedRef.current) {
                  setResult(null);
                  processingRef.current = false;
                }
              }, 4000);
            } else {
              throw new Error(json.error || 'Invalid response from server');
            }
          } catch (fetchError) {
            if (!mountedRef.current) return;

            const errorMessage = fetchError instanceof Error
              ? fetchError.message
              : 'Failed to lookup barcode';

            if (errorMessage.includes('not found')) {
              setError(`🔍 Barcode "${code}" not found in inventory`);
            } else if (errorMessage.includes('Backend URL not configured')) {
              setError('⚙️ Backend connection not configured');
            } else {
              setError(`❌ ${errorMessage}`);
            }

            setTimeout(() => {
              if (mountedRef.current) {
                setError(null);
                processingRef.current = false;
              }
            }, 4000);
          }
        });

        warningTimer = window.setInterval(() => {
          if (!mountedRef.current) return;
          if (Date.now() - lastScanRef.current > 8000 && !processingRef.current) {
            setShowScanWarning(true);
          }
        }, 2000);

        warningTimerRef.current = warningTimer;

      } catch (importError) {
        console.error('Failed to load scanner:', importError);
        setCameraError('Failed to load barcode scanner. Please refresh and try again.');
        setIsLoading(false);
      }
    };

    startScanner();

    return () => {
      cancelled = true;
      if (warningTimer) {
        window.clearInterval(warningTimer);
      }
      if (duplicateTimerRef.current) {
        window.clearInterval(duplicateTimerRef.current);
        duplicateTimerRef.current = null;
      }

      try {
        if (quaggaRef.current) {
          try { quaggaRef.current.offDetected?.(); } catch { }
          try { quaggaRef.current.stop?.(); } catch { }
        }

        const videos = document.querySelectorAll('video');
        videos.forEach(video => {
          const stream = (video as HTMLVideoElement).srcObject as MediaStream | null;
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
          }
          try { (video as HTMLVideoElement).srcObject = null; } catch { }
        });
      } catch (cleanupError) {
        console.warn('Cleanup error:', cleanupError);
      }

      initializedRef.current = false;
      processingRef.current = false;
      recentDetections.current.clear();
    };
  }, [isOpen, onScan, onInventoryChange, onScanResult, session]);

  const handleClose = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setCameraError(null);
    setShowScanWarning(false);
    setIsLoading(false);

    setDuplicateWarning({ show: false, remaining: 0, message: undefined });
    if (duplicateTimerRef.current) {
      window.clearInterval(duplicateTimerRef.current);
      duplicateTimerRef.current = null;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" title="Scan Product Barcode">
          <QrCode className="h-4 w-4 text-blue-600" />
        </Button>
      </SheetTrigger>

      <SheetContent side="right" className="w-full sm:max-w-md p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Product Scanner
          </SheetTitle>
        </SheetHeader>

        <div className="p-6 space-y-4">
          {cameraError ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
              <p className="text-red-700 text-sm font-medium mb-2">Camera Error</p>
              <p className="text-red-600 text-xs">{cameraError}</p>
              <Button
                onClick={() => {
                  setCameraError(null);
                  setIsOpen(false);
                  setTimeout(() => setIsOpen(true), 100);
                }}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="relative bg-black rounded-xl overflow-hidden">
              <div id={SCANNER_ID} className="relative w-full" style={{ height: 320 }}>
                {isLoading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
                    <div className="text-white text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="absolute inset-6 border-2 border-blue-400 rounded-lg pointer-events-none">
                <div className="scanner-line" />
              </div>

              {!isLoading && !result && !error && !duplicateWarning.show && (
                <div className="absolute top-4 left-4 right-4 bg-blue-500 bg-opacity-90 text-white p-2 rounded text-xs text-center">
                  📱 Point camera at barcode and hold steady
                </div>
              )}

              {showScanWarning && !result && !error && !isLoading && !duplicateWarning.show && (
                <div className="absolute top-4 left-4 right-4 bg-yellow-500 text-black p-2 rounded text-sm text-center">
                  ⚠️ No barcode detected — improve lighting or move closer
                </div>
              )}

              {duplicateWarning.show && (
                <div className="absolute top-4 left-4 right-4 bg-yellow-600 text-white p-2 rounded text-sm text-center flex items-center justify-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <div>
                    <div className="font-medium">🚫 Duplicate scan detected</div>
                    <div className="text-xs opacity-90">
                      {duplicateWarning.message ?? 'This barcode was scanned recently.'}
                      {duplicateWarning.remaining > 0 && ` Please wait ${duplicateWarning.remaining}s.`}
                    </div>
                  </div>
                </div>
              )}

              {result && (
                <div className="absolute bottom-4 left-4 right-4 bg-green-500 text-white p-3 rounded-lg">
                  <p className="font-semibold text-sm">✅ {result.product.productName}</p>
                  <p className="text-xs opacity-90">SKU: {result.product.sku} | Serial: {result.serialNumber}</p>
                  <p className="text-xs opacity-90">Box Qty: {result.product.boxQty} | Status: {result.status}</p>
                </div>
              )}

              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500 text-white p-3 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleClose} variant="outline" className="flex-1">Close Scanner</Button>
            {cameraError && (
              <Button onClick={() => window.location.reload()} variant="default" size="sm">Refresh Page</Button>
            )}
          </div>

          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>Supports most barcode formats including Code 128, EAN, UPC</p>
            <p>Make sure barcode is well-lit and in focus</p>
            <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">
              <p className="font-medium">Your Database Barcodes:</p>
              <p>BX000423, BX000422, BX000421, BX000420...</p>
              <p className="text-xs mt-1">
                Visit <span className="font-mono">/barcode-test</span> to display these barcodes for scanning
              </p>
            </div>
          </div>
        </div>

        {/* Render ReturnForm when needed */}
        {showReturnForm && result && (
          <div className="p-4 border-t">
            {/* Render ReturnForm when needed (controlled via isOpen/onOpenChange) */}
            { /* showReturnForm toggles the dialog; ReturnForm will fetch the employee checkouts */}
            <ReturnForm
              employeeId={(session as any)?.user?.id} // or session?.user?.id — ensure session shape
              isOpen={showReturnForm}
              onOpenChange={(open: boolean) => {
                setShowReturnForm(open);
                processingRef.current = open;
              }}

              onReturnComplete={() => {
                setShowReturnForm(false);
                processingRef.current = false;
                onInventoryChange?.();
              }}
            />

          </div>
        )}

      </SheetContent>

      <style jsx>{`
        .scanner-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(59, 130, 246, 0.9);
          animation: scan 2.2s linear infinite;
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
      `}</style>
    </Sheet>
  );
}
