import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { Order } from '@/lib/types';
import { Colors, baseStyles } from '@/lib/theme';

export default function CheckoutScreen() {
  const { user } = useAuth();
  const { cart, totals, cartToken, clearCart } = useCart();
  const router = useRouter();

  const [form, setForm] = useState({
    customerName: user?.name ?? '',
    phone: user?.phone ?? '',
    addressLine: user?.addressLine ?? '',
    comment: '',
  });
  const [busy, setBusy] = useState(false);

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleOrder = async () => {
    if (!form.customerName.trim() || !form.phone.trim() || !form.addressLine.trim()) {
      Alert.alert('Ошибка', 'Заполните имя, телефон и адрес');
      return;
    }

    setBusy(true);
    try {
      const order = await api<Order>('/v1/orders', {
        method: 'POST',
        auth: true,
        body: {
          cartToken,
          customerName: form.customerName.trim(),
          phone: form.phone.trim(),
          addressLine: form.addressLine.trim(),
          comment: form.comment.trim() || undefined,
          settlement: user?.settlement,
        },
      });

      await clearCart();
      router.replace(`/order/${order.orderNumber}`);
    } catch (e: any) {
      Alert.alert('Ошибка', e.message ?? 'Не удалось оформить заказ');
    } finally {
      setBusy(false);
    }
  };

  const items = cart?.items ?? [];

  return (
    <KeyboardAvoidingView
      style={baseStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Text style={styles.sectionTitle}>Ваш заказ</Text>
        {items.map(item => (
          <View key={item.id} style={styles.itemRow}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.product.title} × {item.qty}
            </Text>
            <Text style={styles.itemPrice}>{formatPrice(item.product.price * item.qty)}</Text>
          </View>
        ))}
        <View style={[styles.itemRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalValue}>{formatPrice(totals?.totalAmount ?? 0)}</Text>
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Контактные данные</Text>
        <TextInput
          style={baseStyles.input}
          placeholder="Имя *"
          placeholderTextColor={Colors.textSecondary}
          value={form.customerName}
          onChangeText={v => update('customerName', v)}
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Телефон *"
          placeholderTextColor={Colors.textSecondary}
          value={form.phone}
          onChangeText={v => update('phone', v)}
          keyboardType="phone-pad"
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Адрес доставки *"
          placeholderTextColor={Colors.textSecondary}
          value={form.addressLine}
          onChangeText={v => update('addressLine', v)}
        />
        <TextInput
          style={[baseStyles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Комментарий к заказу"
          placeholderTextColor={Colors.textSecondary}
          value={form.comment}
          onChangeText={v => update('comment', v)}
          multiline
        />

        <TouchableOpacity
          style={[baseStyles.button, { marginTop: 16, opacity: busy ? 0.6 : 1 }]}
          onPress={handleOrder}
          disabled={busy}
        >
          <Text style={baseStyles.buttonText}>
            {busy ? 'Оформление...' : `Оформить — ${formatPrice(totals?.totalAmount ?? 0)}`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: Colors.text,
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
});
