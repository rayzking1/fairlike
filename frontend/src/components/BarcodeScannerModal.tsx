'use client';

import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { X, Camera, AlertCircle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
}

export const BarcodeScannerModal: React.FC<Props> = ({ isOpen, onClose, onScan }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const codeReader = new BrowserMultiFormatReader();
    setError(null);

    const startScanning = async () => {
      try {
        if (videoRef.current) {
          await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result) => {
              if (result) {
                onScan(result.getText());
                onClose();
              }
            }
          );
        }
      } catch (err) {
        console.error(err);
        setError('Моля, разрешете достъпа до камерата в браузъра.');
      }
    };

    startScanning();

    return () => {
      codeReader.reset();
    };
  }, [isOpen, onClose, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col items-center text-white shadow-2xl relative">
        <div className="w-full flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-400" />
            <span className="font-semibold text-sm">Сканирай баркод</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="relative w-full aspect-square bg-black flex items-center justify-center overflow-hidden">
          <video ref={videoRef} className="w-full h-full object-cover" />
          <div className="absolute inset-8 border-2 border-dashed border-emerald-400/80 rounded-lg pointer-events-none flex items-center justify-center">
            <div className="w-full h-0.5 bg-emerald-400/50 animate-pulse"></div>
          </div>

          {error && (
            <div className="absolute inset-0 bg-neutral-900/90 p-6 flex flex-col items-center justify-center text-center gap-2">
              <AlertCircle size={32} className="text-rose-400" />
              <p className="text-xs text-neutral-300">{error}</p>
            </div>
          )}
        </div>

        <div className="p-4 text-center">
          <p className="text-xs text-neutral-400">Насочете камерата към баркода на продукта</p>
        </div>
      </div>
    </div>
  );
};
