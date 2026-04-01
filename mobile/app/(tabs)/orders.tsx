import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice, orderStatusLabel } from '@/lib/format';
import { Colors, baseStyles } from '@/lib/theme';
import type { Order } from '@/lib/types';

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

export default function OrdersScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const data = await api<Order[]>('/v1/me/orders', { auth: true });
      setOrders(data);
    } catch (e) {
      console.error('Failed to load orders', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <View style={baseStyles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📦</Text>
        <Text style={baseStyles.title}>Мои заказы</Text>
        <Text style={[baseStyles.subtitle, { marginTop: 4, marginBottom: 16 }]}>
          Войдите, чтобы увидеть заказы
        </Text>
        <TouchableOpacity style={[baseStyles.button, { paddingHorizontal: 32 }]} onPress={() => router.push('/login')}>
          <Text style={baseStyles.buttonText}>Войти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={baseStyles.container}>
      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchOrders();
            }}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/order/${item.orderNumber}`)}
          >
            <View style={[baseStyles.row, { justifyContent: 'space-between' }]}>
              <Text style={styles.orderNum}>Заказ №{item.orderNumber}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] ?? Colors.textSecondary }]}>
                <Text style={styles.statusText}>{orderStatusLabel(item.status)}</Text>
              </View>
            </View>
            <Text style={styles.date}>
              {new Date(item.createdAt).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
            <Text style={styles.total}>{formatPrice(item.totalAmount)}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={baseStyles.centered}>
            <Text style={baseStyles.subtitle}>Заказов пока нет</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderNum: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  date: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  total: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
});
