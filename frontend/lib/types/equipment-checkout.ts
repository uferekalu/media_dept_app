export interface EquipmentCheckout {
  _id: string;
  equipment: string;
  service?: string;
  checked_out_to: string;
  checked_out_at: string;
  expected_return_at: string;
  returned_at?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
