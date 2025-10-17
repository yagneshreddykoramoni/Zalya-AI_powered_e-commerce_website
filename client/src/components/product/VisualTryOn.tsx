
import React, { useMemo, useRef, useState } from 'react';
import { Camera, Upload, RefreshCw, Share2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import ShareToCommunity from './ShareToCommunity';
import { Product } from '@/lib/types';
import { getImageUrl } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import api from '@/services/api';

interface VisualTryOnProps {
  productName: string;
  productImage: string;
  product: Product;
}

interface FitMetadata {
  top_left?: {
    x: number;
    y: number;
  };
  rendered_width?: number;
  rendered_height?: number;
  shoulder_confidence?: number;
  hip_confidence?: number;
  neck_y?: number;
  torso_polygon?: Array<{
    x: number;
    y: number;
  }>;
}

interface TryOnMetadata {
  model_id?: string;
  device?: string;
  inference_seconds?: number;
  steps?: number;
  guidance_scale?: number;
  seed?: number | null;
  productId?: string | null;
  productName?: string | null;
  fit?: FitMetadata;
  source_user_mime?: string;
  source_product_mime?: string;
  provider?: string;
  endpoint?: string;
  request_id?: string;
  server?: string;
  [key: string]: unknown;
}

const VisualTryOn: React.FC<VisualTryOnProps> = ({ productName, productImage, product }) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [tryOnResult, setTryOnResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultMetadata, setResultMetadata] = useState<TryOnMetadata | null>(null);
  const { toast } = useToast();

  const productImageUrl = useMemo(() => {
    if (!productImage) return '';
    try {
      return getImageUrl(productImage);
    } catch (error) {
      console.warn('Unable to resolve product image URL:', error);
      return '';
    }
  }, [productImage]);

  const endpointHost = useMemo(() => {
    if (!resultMetadata?.endpoint || typeof resultMetadata.endpoint !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(resultMetadata.endpoint);
      return parsed.host;
    } catch (error) {
      return resultMetadata.endpoint;
    }
  }, [resultMetadata?.endpoint]);

  const resetTryOn = () => {
    setUserImage(null);
    setTryOnResult(null);
    setIsProcessing(false);
    setIsShareDialogOpen(false);
    setErrorMessage(null);
    setResultMetadata(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileInput = event.target;

    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        const imageData = reader.result as string;
        setUserImage(imageData);
        setTryOnResult(null);
        setErrorMessage(null);
        setResultMetadata(null);
        void processImage(imageData);

        // reset the input so the same file can be re-selected if needed
        fileInput.value = '';
      };

      reader.readAsDataURL(file);
    }
  };

  const processImage = async (sourceImage?: string) => {
    const baseImage = sourceImage ?? userImage;
    if (!baseImage) {
      return;
    }

    if (!productImageUrl) {
      const message = 'Unable to resolve product image for try-on.';
      setErrorMessage(message);
      toast({
        title: 'Virtual try-on unavailable',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    setErrorMessage(null);
    setIsProcessing(true);
    setTryOnResult(null);
    setResultMetadata(null);

    try {
      const { data } = await api.post('/ai/virtual-try-on', {
        userImage: baseImage,
        productImageUrl,
        modelId: 'simple-virtual-try-on-v1',
        productName,
        productId: product?._id || product?.id,
      });

      const outputBase64: string | undefined = data?.outputImage;
      const mimeType: string = data?.mimeType || 'image/png';

      if (outputBase64) {
        setTryOnResult(`data:${mimeType};base64,${outputBase64}`);
        setResultMetadata(data?.metadata ?? null);
      } else {
        throw new Error('The virtual try-on service did not return an image.');
      }
    } catch (error) {
      const message =
        typeof error === 'string'
          ? error
          : error instanceof Error
            ? error.message
            : 'Unable to complete virtual try-on.';

      setResultMetadata(null);
      setErrorMessage(message);
      toast({
        title: 'Virtual try-on failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleShareToCommunity = () => {
    setIsShareDialogOpen(true);
  };

  return (
    <>
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            resetTryOn();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="group relative items-center gap-2 overflow-hidden border-none bg-gradient-to-r from-fuchsia-500 via-purple-500 to-indigo-500 text-white shadow-[0_14px_30px_-18px_rgba(129,140,248,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-transparent hover:shadow-[0_20px_36px_-16px_rgba(129,140,248,0.95)] focus-visible:ring-offset-2"
          >
            <Camera size={16} />
            Virtual Try-On
          </Button>
        </DialogTrigger>
    <DialogContent className="sm:max-w-md md:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Virtual Try-On: {productName}</DialogTitle>
          </DialogHeader>
          <DialogDescription className="text-sm text-gray-500">
            Upload a photo to preview how {productName} could look on you using our AI try-on.
          </DialogDescription>
          
          <div className="grid gap-6 pr-1 pb-2">
            {!userImage ? (
              <div className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-white/50 p-6 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-10 w-10 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Upload your photo to pair it with {productName}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Select Photo
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-indigo-200/70 bg-indigo-50/40 p-4">
                  <div className="flex flex-col items-center gap-3 md:flex-row md:gap-5">
                    <div className="aspect-[3/4] w-24 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-indigo-100 md:w-28">
                      <img
                        src={userImage}
                        alt="Uploaded reference"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-indigo-500 shadow-sm ring-1 ring-indigo-100">
                      <Plus className="h-5 w-5" />
                    </span>
                    <div className="aspect-[3/4] w-24 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-indigo-100 md:w-28">
                      {productImageUrl ? (
                        <img
                          src={productImageUrl}
                          alt={productName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
                          Image unavailable
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-medium uppercase tracking-widest text-indigo-500">
                    Your photo + {productName}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUserImage(null);
                      setTryOnResult(null);
                      setIsProcessing(false);
                    }}
                  >
                    Change Photo
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shadow-inner">
                    {isProcessing ? (
                      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-white via-gray-50 to-gray-100 px-6 py-10 text-center">
                        <div className="relative h-16 w-16">
                          <div className="absolute inset-0 rounded-full border-4 border-indigo-200" />
                          <div className="absolute inset-0 rounded-full border-t-4 border-indigo-500 animate-spin" />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-indigo-600">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Scanning your style...</span>
                        </div>
                        <div className="h-1.5 w-36 overflow-hidden rounded-full bg-indigo-100">
                          <div className="h-full w-full animate-pulse rounded-full bg-indigo-400" />
                        </div>
                        <p className="text-xs text-gray-500">This may take a few seconds.</p>
                      </div>
                    ) : tryOnResult ? (
                      <img
                        src={tryOnResult}
                        alt={`Try-on result for ${productName}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 py-10 text-center">
                        <p className="text-sm text-gray-500">Upload a photo to start scanning.</p>
                      </div>
                    )}
                  </div>
                  {resultMetadata && (
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-indigo-700">
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {resultMetadata.model_id && (
                          <span>
                            <span className="font-semibold">Model:</span> {resultMetadata.model_id}
                          </span>
                        )}
                        {resultMetadata.device && (
                          <span>
                            <span className="font-semibold">Device:</span> {resultMetadata.device}
                          </span>
                        )}
                        {typeof resultMetadata.inference_seconds === 'number' && (
                          <span>
                            <span className="font-semibold">Time:</span> {resultMetadata.inference_seconds.toFixed(2)}s
                          </span>
                        )}
                        {typeof resultMetadata.steps === 'number' && (
                          <span>
                            <span className="font-semibold">Steps:</span> {resultMetadata.steps}
                          </span>
                        )}
                        {typeof resultMetadata.guidance_scale === 'number' && (
                          <span>
                            <span className="font-semibold">Guidance:</span> {resultMetadata.guidance_scale}
                          </span>
                        )}
                        {typeof resultMetadata.seed === 'number' && (
                          <span>
                            <span className="font-semibold">Seed:</span> {resultMetadata.seed}
                          </span>
                        )}
                        {resultMetadata.source_user_mime && (
                          <span>
                            <span className="font-semibold">Input:</span> {resultMetadata.source_user_mime.replace('image/', '')}
                          </span>
                        )}
                        {resultMetadata.source_product_mime && (
                          <span>
                            <span className="font-semibold">Product:</span> {resultMetadata.source_product_mime.replace('image/', '')}
                          </span>
                        )}
                        {typeof resultMetadata.provider === 'string' && resultMetadata.provider.trim() !== '' && (
                          <span>
                            <span className="font-semibold">Source:</span> {resultMetadata.provider}
                          </span>
                        )}
                        {typeof resultMetadata.server === 'string' && resultMetadata.server.trim() !== '' && (
                          <span>
                            <span className="font-semibold">Server:</span> {resultMetadata.server}
                          </span>
                        )}
                        {typeof resultMetadata.request_id === 'string' && resultMetadata.request_id.trim() !== '' && (
                          <span>
                            <span className="font-semibold">Request:</span> {resultMetadata.request_id.slice(0, 12)}…
                          </span>
                        )}
                        {endpointHost && (
                          <span>
                            <span className="font-semibold">Endpoint:</span> {endpointHost}
                          </span>
                        )}
                        {resultMetadata.fit?.neck_y !== undefined && (
                          <span>
                            <span className="font-semibold">Neck Y:</span> {resultMetadata.fit.neck_y}px
                          </span>
                        )}
                      </div>
                      {resultMetadata.fit && (
                        <div className="mt-2 grid gap-1 text-[10px] text-indigo-600 sm:grid-cols-2">
                          {typeof resultMetadata.fit.shoulder_confidence === 'number' && (
                            <span>
                              Shoulder confidence: {(resultMetadata.fit.shoulder_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {typeof resultMetadata.fit.hip_confidence === 'number' && (
                            <span>
                              Hip confidence: {(resultMetadata.fit.hip_confidence * 100).toFixed(0)}%
                            </span>
                          )}
                          {typeof resultMetadata.fit.rendered_width === 'number' && (
                            <span>
                              Render width: {resultMetadata.fit.rendered_width}px
                            </span>
                          )}
                          {typeof resultMetadata.fit.rendered_height === 'number' && (
                            <span>
                              Render height: {resultMetadata.fit.rendered_height}px
                            </span>
                          )}
                          {resultMetadata.fit.top_left && (
                            <span>
                              Position: x{resultMetadata.fit.top_left.x}, y{resultMetadata.fit.top_left.y}
                            </span>
                          )}
                          {resultMetadata.fit.torso_polygon && resultMetadata.fit.torso_polygon.length > 0 && (
                            <span className="sm:col-span-2">
                              Torso poly: {resultMetadata.fit.torso_polygon.map((point, idx) => `(${point.x},${point.y})${idx < resultMetadata.fit!.torso_polygon!.length - 1 ? ' · ' : ''}`)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-sm font-medium text-gray-600 text-center">AI Try-On Preview</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {tryOnResult ? (
                      <Button
                        variant="outline"
                        onClick={() => void processImage()}
                        disabled={isProcessing}
                      >
                        Regenerate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        disabled
                        className="flex items-center gap-2"
                      >
                        <RefreshCw className={`h-4 w-4 ${isProcessing ? 'animate-spin text-indigo-400' : 'text-gray-400'}`} />
                        {isProcessing ? 'Scanning in progress' : 'Awaiting upload'}
                      </Button>
                    )}
                    <Button
                      onClick={handleShareToCommunity}
                      className="flex items-center gap-2"
                      disabled={!tryOnResult || isProcessing}
                    >
                      <Share2 size={14} />
                      Share to Community
                    </Button>
                  </div>
                  {errorMessage && (
                    <p className="text-xs text-red-500 text-center">{errorMessage}</p>
                  )}
                </div>
              </div>
            )}

            <div className="text-sm text-gray-500">
              <p>Note: This feature uses AI to simulate how the garment might look on you. Results are approximations and may vary from the actual fit.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ShareToCommunity 
        product={product}
        open={isShareDialogOpen}
        onClose={() => setIsShareDialogOpen(false)}
        tryOnImage={tryOnResult}
      />
    </>
  );
};

export default VisualTryOn;
