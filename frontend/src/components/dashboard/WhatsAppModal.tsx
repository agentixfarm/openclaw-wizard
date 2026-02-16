import { useState, useEffect, useRef } from 'react';
import { X, Loader2, CheckCircle, XCircle, Smartphone } from 'lucide-react';

interface WhatsAppProgress {
  stage: string;
  status: string;
  message: string;
  qrCode?: string;
  error?: string;
}

interface WhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for connecting WhatsApp via QR code
 */
export function WhatsAppModal({ isOpen, onClose }: WhatsAppModalProps) {
  const [progress, setProgress] = useState<WhatsAppProgress | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Close WebSocket when modal closes
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProgress(null);
      setQrCode(null);
      return;
    }

    // Connect to WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/whatsapp/connect`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WhatsApp WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data: WhatsAppProgress = JSON.parse(event.data);
        console.log('WhatsApp progress received:', data);
        setProgress(data);

        // Update QR code when received
        if (data.qrCode) {
          setQrCode(data.qrCode);
        }
      } catch (e) {
        console.error('Failed to parse WhatsApp progress:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WhatsApp WebSocket error:', error);
      setProgress({
        stage: 'error',
        status: 'failed',
        message: 'Connection error',
        error: 'WebSocket connection failed',
      });
    };

    ws.onclose = () => {
      console.log('WhatsApp WebSocket closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isConnecting = progress?.status === 'running';
  const isSuccess = progress?.status === 'completed';
  const isFailed = progress?.status === 'failed';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-zinc-700">
          <div className="flex items-center gap-3">
            <Smartphone className="w-6 h-6 text-green-600 dark:text-green-500" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Connect WhatsApp
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status */}
          {progress && (
            <div className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-zinc-900 rounded-lg">
              {isConnecting && <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-500 animate-spin flex-shrink-0 mt-0.5" />}
              {isSuccess && <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />}
              {isFailed && <XCircle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {progress.stage.replace(/-/g, ' ')}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                  {progress.message}
                </p>
                {progress.error && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                    {progress.error}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* QR Code Display */}
          {qrCode && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Scan with WhatsApp
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Open WhatsApp on your phone → Settings → Linked Devices → Link a Device
                </p>
              </div>

              <div className="bg-black p-8 rounded-lg border-2 border-gray-200 dark:border-zinc-700 overflow-x-auto">
                <pre className="font-mono text-xs leading-tight whitespace-pre text-white">
                  {qrCode}
                </pre>
              </div>
            </div>
          )}

          {/* Instructions */}
          {!isSuccess && !isFailed && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-gray-100">How to connect:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>Open WhatsApp on your phone</li>
                <li>Tap Settings (⋮) → Linked Devices</li>
                <li>Tap "Link a Device"</li>
                <li>Scan the QR code above</li>
              </ol>
            </div>
          )}

          {/* Success Message */}
          {isSuccess && (
            <div className="text-center py-6">
              <CheckCircle className="w-16 h-16 text-green-600 dark:text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Connected Successfully!
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your WhatsApp account is now linked. You can start chatting with your agent.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-zinc-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-zinc-700 rounded-md transition-colors"
          >
            {isSuccess || isFailed ? 'Close' : 'Cancel'}
          </button>
        </div>
      </div>
    </div>
  );
}
