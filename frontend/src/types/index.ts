export interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  supplierMinimum?: number; // Минимална сума за поръчка от този бранд (напр. 50 лв.)
  unitsPerCase: number;
  casePrice: float; // цена на едро за цял стек
  rrpPrice: number;  // препоръчителна цена на дребно за бройка (RRP)
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}
