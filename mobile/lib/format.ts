/** Format kopeks to rubles string, e.g. 15000 → "150 ₽" */
export function formatPrice(kopeks: number): string {
  const rubles = kopeks / 100;
  return `${rubles.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ₽`;
}

/** Order status in Russian */
export function orderStatusLabel(status: string): string {
  const map: Record<string, string> = {
    NEW: 'Новый',
    CONFIRMED: 'Подтверждён',
    ASSEMBLING: 'Собирается',
    ASSIGNED_TO_COURIER: 'Назначен курьер',
    ACCEPTED_BY_COURIER: 'Курьер принял',
    ON_THE_WAY: 'В пути',
    DELIVERED: 'Доставлен',
    CANCELED: 'Отменён',
  };
  return map[status] ?? status;
}
