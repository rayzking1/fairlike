'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useCart } from '@/context/CartContext';
import { 
  Building2, MapPin, Clock, ShieldCheck, 
  Package, ShoppingCart, Check, Award
} from 'lucide-react';

interface CartProduct {
  id: string;
  name: string;
  brand: string;
  supplierName: string;
  category: string;
  pricePerUnit: number;
  caseQuantity: number;
  minOrderQuantity: number;
  stock: number;
  barcode: string;
  imageUrl: string;
  description: string;
}

interface BrandProfile {
  name: string;
  bio: string;
  story: string;
  city: string;
  cover_image_url: string;
  lead_time_days: string;
  brand_values: string[];
  products_count: number;
}

export default function BrandShowcasePage() {
  const params = useParams();
  const slug = params?.slug ? decodeURIComponent(params.slug as string) : '';
  const { addToCart } = useCart();

  const [products, setProducts] = useState<CartProduct[]>([]);
  const [profile, setProfile] = useState<BrandProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (!slug) return;

    async function loadData() {
      setLoading(true);
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://fairlike-backend.onrender.com';
      
      try {
        const profileRes = await fetch(`${apiBase}/api/brands/${encodeURIComponent(slug)}`);
        if (profileRes.ok) {
          const profData = await profileRes.json();
          setProfile(profData);
        }

        const prodRes = await fetch(`${apiBase}/api/products/`);
        if (prodRes.ok) {
          const allProds: CartProduct[] = await prodRes.json();
          const filtered = allProds.filter((p: CartProduct) => 
            p.brand?.toLowerCase() === slug.toLowerCase() || 
            p.supplierName?.toLowerCase() === slug.toLowerCase()
          );
          setProducts(filtered);
        }
      } catch (err) {
        console.error("Грешка при зареждане на бранда:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [slug]);

  const handleAdd = (product: CartProduct) => {
    addToCart(product, product.minOrderQuantity || 1);
    setAddedIds((prev) => ({ ...prev, [product.id]: true }));
    setTimeout(() => {
      setAddedIds((prev) => ({ ...prev, [product.id]: false }));
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Navbar />

      <div className="relative h-64 sm:h-80 w-full bg-slate-900 overflow-hidden">
        <img 
          src={profile?.cover_image_url || "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80"} 
          alt={slug}
          className="w-full h-full object-cover opacity-60 filter brightness-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 absolute inset-0 flex flex-col justify-end pb-8">
          <div className="flex flex-wrap items-end gap-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-white p-3 shadow-2xl flex items-center justify-center border-4 border-white/90">
              <Building2 className="w-12 h-12 text-blue-600" />
            </div>

            <div className="flex-1 text-white">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{profile?.name || slug}</h1>
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <ShieldCheck className="w-3.5 h-3.5" /> Проверен B2B партньор
                </span>
              </div>
              <p className="text-slate-300 text-sm max-w-2xl">{profile?.bio || "Официален фабричен дистрибутор и производител."}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <MapPin className="w-4 h-4 text-blue-600" /> {profile?.city || "гр. София"}
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Clock className="w-4 h-4 text-amber-600" /> Срок за експедиция: {profile?.lead_time_days || "24-48 часа"}
            </div>
            <div className="flex items-center gap-1.5 font-medium text-slate-700">
              <Package className="w-4 h-4 text-emerald-600" /> {products.length} артикула на склад
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(profile?.brand_values || ["Произведено в България", "Директно от фабрика", "ЗДДС фактуриране"]).map((v, idx) => (
              <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold border border-slate-200">
                {v}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-10 bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-3 text-slate-900 font-bold text-lg">
            <Award className="w-5 h-5 text-blue-600" /> За марката и производството
          </div>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
            {profile?.story || "Този производител предоставя качествени продукти с доказан произход, покриващи всички европейски стандарти за безопасност и дистрибуция."}
          </p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Каталог на едро ({products.length})</h2>
          <span className="text-xs text-slate-500 font-medium">Цените са без ДДС за брой</span>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Зареждане на каталога...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8">
            <p className="text-slate-600">Все още няма добавени артикули от този производител.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p) => {
              const casePrice = (p.pricePerUnit * (p.caseQuantity || 1)).toFixed(2);
              const minBoxes = p.minOrderQuantity || 1;
              const minOrderTotal = (p.pricePerUnit * (p.caseQuantity || 1) * minBoxes).toFixed(2);
              const isAdded = !!addedIds[p.id];

              return (
                <div key={p.id} className="bg-white rounded-2xl border border-slate-200 hover:shadow-xl transition-all flex flex-col justify-between overflow-hidden group">
                  <div className="p-4">
                    <div className="h-44 w-full bg-slate-50 rounded-xl mb-4 overflow-hidden flex items-center justify-center p-3 relative">
                      <img 
                        src={p.imageUrl || 'https://placehold.co/300x300?text=No+Image'} 
                        alt={p.name}
                        className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" 
                      />
                      <span className="absolute top-2 left-2 bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-100">
                        {p.category || 'Храни и напитки'}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[40px]">{p.name}</h3>
                    <p className="text-[11px] text-slate-400 mb-3">Баркод: {p.barcode || 'Няма'}</p>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1 mb-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500">Цена / брой:</span>
                        <span className="text-base font-black text-blue-600">{Number(p.pricePerUnit).toFixed(2)} лв.</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-600">
                        <span>Кашон ({p.caseQuantity || 1} бр.):</span>
                        <span className="font-semibold">{casePrice} лв.</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span>Мин. заявка ({minBoxes} каш.):</span>
                        <span className="font-bold text-slate-700">{minOrderTotal} лв.</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    <button
                      onClick={() => handleAdd(p)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        isAdded
                          ? 'bg-emerald-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Check className="w-4 h-4" /> Добавено!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" /> Добави {minBoxes} каш.
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
