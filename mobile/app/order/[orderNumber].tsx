import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { formatPrice, orderStatusLabel } from '@/lib/format';
import type { Order } from '@/lib/types';
import { Colors, baseStyles } from '@/lib/theme';

const statusColors: Record<string, string> = {
  NEW: '#3b82f6',
  CONFIRMED: '#8b5cf6',
  ASSEMBLING: '#f59e0b',
  ASSIGNED_TO_COURIER: '#6366f1',
  ACCEPTED_BY_COURIER: '#6366f1',
  ON_THE_WAY: '#0ea5e9',
  DELIVERED: '#22c55e',
  CANCELED: '#ef4444',
};

export default function OrderScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const data = await api<Order>(`/v1/orders/${orderNumber}`);
      setOrder(data);
    } catch (e) {
      console.error('Failed to load order', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  const handleCancel = async () => {
    Alert.alert('Отмена заказа', 'Вы уверены?', [
      { text: 'Нет', style: 'cancel' },
      {
        text: 'Да, отменить',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/v1/orders/${orderNumber}/cancel`, { method: 'PATCH', auth: true });
            fetchOrder();
          } catch (e: any) {
            Alert.alert('Ошибка', e.message ?? 'Не удалось отменить');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={baseStyles.centered}>
        <Text style={baseStyles.subtitle}>Заказ не найден</Text>
      </View>
    );
  }

  const subtotal = order.totalAmount - order.deliveryFee;

  return (
    <View style={baseStyles.container}>
      <Stack.Screen options={{ title: `Заказ №${order.orderNumber}` }} />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColors[order.status] ?? Colors.textSecondary }]}>
            <Text style={styles.statusText}>{orderStatusLabel(order.status)}</Text>
          </View>
          <Text style={styles.date}>
            {new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={baseStyles.card}>
          <Text style={styles.sectionTitle}>Товары</Text>
          {order.items.map(item => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {item.title} × {item.qty}
              </Text>
              <Text style={styles.itemPrice}>{formatPrice(item.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={baseStyles.card}>
          <Text style={styles.sectionTitle}>Итого</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Товары</Text>
            <Text style={styles.summaryValue}>{formatPrice(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Доставка</Text>
            <Text style={styles.summaryValue}>
              {order.deliveryFee === 0 ? 'Бесплатно' : formatPrice(order.deliveryFee)}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderTopWidth: 2, borderTopColor: Colors.text, marginTop: 8, paddingTop: 10 }]}>
            <Text style={styles.totalLabel}>Итого</Text>
            <Text style={styles.totalValue}>{formatPrice(order.totalAmount)}</Text>
          </View>
        </View>

        <View style={baseStyles.card}>
          <Text style={styles.sectionTitle}>Доставка</Text>
          <Text style={styles.infoText}>{order.customerName}</Text>
          <Text style={styles.infoText}>{order.phone}</Text>
          <Text style={styles.infoText}>{order.addressLine}</Text>
          {order.comment && <Text style={[styles.infoText, { color: Colors.textSecondary }]}>{order.comment}</Text>}
        </View>

        {order.status === 'NEW' && (
          <TouchableOpacity
            style={[baseStyles.button, { backgroundColor: Colors.danger, marginHorizontal: 16, marginTop: 10 }]}
            onPress={handleCancel}
          >
            <Text style={baseStyles.buttonText}>Отменить заказ</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[baseStyles.button, { marginHorizontal: 16, marginTop: 12, marginBottom: 20 }]}
          onPress={() => router.replace('/(tabs)')}
        >
          <Text style={baseStyles.buttonText}>На главную</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  statusSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemTitle: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
});
