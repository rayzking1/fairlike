'use client';

import React from 'react';
import { Product } from '@/types';
import { Plus, Minus, TrendingUp } from 'lucide-react';

interface Props {
  product: Product;
  quantity: number;
  onUpdateQuantity: (id: string, delta: number) => void;
}

export const ProductCard: React.FC<Props> = ({ product, quantity, onUpdateQuantity }) => {
  const unitWholesale = product.casePrice / product.unitsPerCase;
  const retailTotalPerCase = product.rrpPrice * product.unitsPerCase;
  const profitPerCase = retailTotalPerCase - product.casePrice;
  const marginPercent = Math.round((profitPerCase / retailTotalPerCase) * 100);

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div className="space-y-3">
        <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-neutral-100">
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 bg-black/75 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
            {product.supplierName}
          </span>
          <span className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 backdrop-blur-sm">
            <TrendingUp size={11} /> {marginPercent}% Марж
          </span>
        </div>

        <div>
          <h3 className="font-semibold text-sm text-neutral-900 leading-snug line-clamp-2">{product.name}</h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">Баркод: {product.barcode}</p>
        </div>

        <div className="bg-neutral-50 rounded-xl p-2.5 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-neutral-500">Стек ({product.unitsPerCase} бр.):</span>
            <span className="font-bold text-neutral-900">{product.casePrice.toFixed(2)} лв.</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400">Едрова за 1 бр.:</span>
            <span className="text-neutral-600">{unitWholesale.toFixed(2)} лв.</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-neutral-400">Препоръчителна на дребно:</span>
            <span className="text-emerald-700 font-semibold">{product.rrpPrice.toFixed(2)} лв./бр.</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
        <div className="text-xs">
          <p className="text-[10px] text-neutral-400">Печалба от стек</p>
          <p className="font-bold text-emerald-600">+{profitPerCase.toFixed(2)} лв.</p>
        </div>

        {quantity === 0 ? (
          <button
            onClick={() => onUpdateQuantity(product.id, 1)}
            className="bg-neutral-900 hover:bg-neutral-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 active:scale-95 transition-all"
          >
            <Plus size={14} /> Добави
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-neutral-100 rounded-xl p-1">
            <button
              onClick={() => onUpdateQuantity(product.id, -1)}
              className="p-1 hover:bg-white rounded-lg text-neutral-700 active:scale-95"
            >
              <Minus size={14} />
            </button>
            <span className="text-xs font-bold w-4 text-center">{quantity}</span>
            <button
              onClick={() => onUpdateQuantity(product.id, 1)}
              className="p-1 hover:bg-white rounded-lg text-neutral-700 active:scale-95"
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
