export type KopilkaContribution = {
  id: string;
  memberId: string;
  amount: number;
  paidMonths: string; // JSON string: '["2025-11","2025-12"]'
};

export type KopilkaMember = {
  id: string;
  kopilkaId: string;
  name: string;
  contributions: KopilkaContribution[];
};

export type Kopilka = {
  id: string;
  shareId: string;
  name: string;
  goalAmount: number;
  startMonth: string; // "2025-11"
  createdAt: string;
  updatedAt: string;
  members: KopilkaMember[];
};

export type CreateKopilkaPayload = {
  name: string;
  goalAmount: number;
  startMonth: string;
  members: string[];
};
