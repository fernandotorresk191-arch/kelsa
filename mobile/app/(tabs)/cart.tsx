import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { mediaUrl } from '@/lib/api';
import { formatPrice } from '@/lib/format';
import { Colors, baseStyles } from '@/lib/theme';

export default function CartScreen() {
  const { cart, totals, loading, updateQty, removeItem } = useCart();
  const { user } = useAuth();
  const router = useRouter();

  if (loading && !cart) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <View style={baseStyles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>🛒</Text>
        <Text style={baseStyles.title}>Корзина пуста</Text>
        <Text style={[baseStyles.subtitle, { marginTop: 4 }]}>Добавьте товары из каталога</Text>
      </View>
    );
  }

  const handleCheckout = () => {
    if (!user) {
      Alert.alert('Вход', 'Войдите в аккаунт для оформления заказа', [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Войти', onPress: () => router.push('/login') },
      ]);
      return;
    }
    router.push('/checkout');
  };

  return (
    <View style={baseStyles.container}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity
              onPress={() => router.push(`/product/${item.productId}`)}
              style={baseStyles.row}
            >
              {item.product.imageUrl ? (
                <Image
                  source={{ uri: mediaUrl(item.product.imageUrl) }}
                  style={styles.image}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={[styles.image, styles.placeholder]}>
                  <Text style={{ fontSize: 24 }}>📦</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.product.title}
                </Text>
                <Text style={styles.price}>{formatPrice(item.product.price)}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => {
                  if (item.qty <= 1) removeItem(item.id);
                  else updateQty(item.id, item.qty - 1);
                }}
              >
                <Text style={styles.qtyBtnText}>{item.qty <= 1 ? '🗑' : '−'}</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{item.qty}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => updateQty(item.id, item.qty + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.itemTotal}>{formatPrice(item.product.price * item.qty)}</Text>
            </View>
          </View>
        )}
      />

      <View style={styles.footer}>
        <View style={[baseStyles.row, { justifyContent: 'space-between', marginBottom: 12 }]}>
          <Text style={styles.totalLabel}>Итого</Text>
          <Text style={styles.totalValue}>{formatPrice(totals?.totalAmount ?? 0)}</Text>
        </View>
        <TouchableOpacity style={baseStyles.button} onPress={handleCheckout}>
          <Text style={baseStyles.buttonText}>Оформить заказ</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  image: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: Colors.border,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  price: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  qtyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  qty: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 14,
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    marginLeft: 'auto',
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
});
