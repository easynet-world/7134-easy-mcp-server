// Product domain model

export class Product {
  // @description ('Product ID')
  id: string;
  // @description ('Product name')
  name: string;
  // @description ('Unit price')
  price: number = 0;
  // @description ('Labels')
  tags: string[] = [];
}

export {};
