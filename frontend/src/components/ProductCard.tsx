import React from 'react';
import { Product } from '@/types';
import { Plus, Minus } from 'lucide-react';

interface Props {
  product: Product;
  quantity: number;
  onUpdateQuantity: (productId: string, delta: number) => void;
}

export const ProductCard: React.FC<Props> = ({ product, quantity, onUpdateQuantity }) => {
  const unitPrice = product.casePrice / product.unitsPerCase;
  const margin = (((product.rrpPrice - unitPrice) / product.rrpPrice) * 100).toFixed(0);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm flex flex-col justify-between">
      <div>
        <div className="relative aspect-square w-full bg-neutral-50 p-4 flex items-center justify-center">
          <img src={product.imageUrl} alt={product.name} className="object-contain max-h-full max-w-full mix-blend-multiply" />
          <span className="absolute top-2 right-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">+{margin}% марж</span>
        </div>
        <div className="p-4 space-y-1">
          <p className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">{product.supplierName}</p>
          <h3 className="font-semibold text-neutral-900 text-sm line-clamp-2 leading-snug">{product.name}</h3>
          <p className="text-xs text-neutral-400">Баркод: {product.barcode}</p>
          <div className="pt-2 border-t border-neutral-100 flex items-baseline justify-between mt-2">
            <div>
              <span className="text-base font-bold text-neutral-900">{product.casePrice.toFixed(2)} лв.</span>
              <span className="text-xs text-neutral-500 font-normal"> / стек</span>
              <p className="text-xs text-neutral-500">{unitPrice.toFixed(2)} лв./бр. ({product.unitsPerCase} бр.)</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-neutral-400 block">Препор. цена</span>
              <span className="text-xs font-semibold text-neutral-700">{product.rrpPrice.toFixed(2)} лв.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="p-4 pt-0">
        {quantity === 0 ? (
          <button onClick={() => onUpdateQuantity(product.id, 1)} className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-1.5 active:scale-[0.99]">
            <Plus size={16} /> Добави стек
          </button>
        ) : (
          <div className="flex items-center justify-between bg-neutral-100 rounded-lg p-1">
            <button onClick={() => onUpdateQuantity(product.id, -1)} className="p-1 bg-white text-neutral-800 rounded shadow-sm hover:bg-neutral-50"><Minus size={16} /></button>
            <span className="font-semibold text-sm px-2">{quantity} стека</span>
            <button onClick={() => onUpdateQuantity(product.id, 1)} className="p-1 bg-white text-neutral-800 rounded shadow-sm hover:bg-neutral-50"><Plus size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
};
