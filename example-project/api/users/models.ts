// User domain model

export class User {
  // @description ('User ID')
  id: number;
  // @description ('Display name')
  name: string;
  // @description ('Active flag')
  active: boolean = true;
  // @description ('Email address')
  email: string = '';
}

export {};
