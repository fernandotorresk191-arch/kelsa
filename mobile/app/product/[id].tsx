import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, Stack } from 'expo-router';
import { api, mediaUrl } from '@/lib/api';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { Product } from '@/lib/types';
import { Colors, baseStyles } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function ProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { cart, addItem, updateQty, removeItem } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const settlement = user?.settlement ?? '';

  useEffect(() => {
    (async () => {
      try {
        const qs = settlement ? `&settlement=${settlement}` : '';
        const prods = await api<Product[]>(`/v1/products?limit=1${qs}`);
        // The API doesn't have GET /products/:id, so we find by filtering
        // Actually let's try fetching all and finding - or use search
        const all = await api<Product[]>(`/v1/products?limit=200${qs}`);
        const found = all.find(p => p.id === id);
        setProduct(found ?? null);
      } catch (e) {
        console.error('Failed to load product', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, settlement]);

  if (loading) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={baseStyles.centered}>
        <Text style={baseStyles.subtitle}>Товар не найден</Text>
      </View>
    );
  }

  const cartItem = cart?.items?.find(i => i.productId === product.id);

  return (
    <View style={baseStyles.container}>
      <Stack.Screen options={{ title: product.title }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {product.imageUrl ? (
          <Image
            source={{ uri: mediaUrl(product.imageUrl) }}
            style={styles.image}
            contentFit="cover"
            transition={300}
          />
        ) : (
          <View style={[styles.image, styles.placeholder]}>
            <Text style={{ fontSize: 64 }}>📦</Text>
          </View>
        )}

        <View style={styles.content}>
          <Text style={styles.title}>{product.title}</Text>
          {product.weight && <Text style={styles.weight}>{product.weight}</Text>}

          <View style={[baseStyles.row, { marginTop: 12, gap: 10 }]}>
            <Text style={styles.price}>{formatPrice(product.price)}</Text>
            {product.oldPrice && (
              <Text style={styles.oldPrice}>{formatPrice(product.oldPrice)}</Text>
            )}
          </View>

          {product.description && (
            <Text style={styles.description}>{product.description}</Text>
          )}

          {product.category && (
            <View style={styles.categoryTag}>
              <Text style={styles.categoryText}>{product.category.name}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {cartItem ? (
          <View style={[baseStyles.row, { justifyContent: 'center', gap: 20 }]}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => {
                if (cartItem.qty <= 1) removeItem(cartItem.id);
                else updateQty(cartItem.id, cartItem.qty - 1);
              }}
            >
              <Text style={styles.qtyBtnText}>{cartItem.qty <= 1 ? '🗑' : '−'}</Text>
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{cartItem.qty}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => updateQty(cartItem.id, cartItem.qty + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={baseStyles.button}
            onPress={() => addItem(product.id)}
          >
            <Text style={baseStyles.buttonText}>В корзину — {formatPrice(product.price)}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: 300,
    backgroundColor: Colors.border,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  weight: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  price: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
  },
  oldPrice: {
    fontSize: 18,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
    marginTop: 16,
  },
  categoryTag: {
    marginTop: 16,
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
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
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.text,
  },
  qtyValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 30,
    textAlign: 'center',
  },
});
