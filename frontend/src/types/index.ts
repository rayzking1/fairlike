export interface Product {
  id: string;
  name: string;
  category: string;
  barcode: string;
  supplierName: string;
  supplierMinimum?: number;
  unitsPerCase: number;
  casePrice: number;
  rrpPrice: number;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  qty: number;
}
