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
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { api, mediaUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useCart } from '@/lib/cart';
import { formatPrice } from '@/lib/format';
import type { Product, Category } from '@/lib/types';
import { Colors, baseStyles } from '@/lib/theme';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { addItem } = useCart();
  const settlement = user?.settlement ?? '';

  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [activeSubcat, setActiveSubcat] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  const fetchData = async () => {
    const qs = settlement ? `&settlement=${settlement}` : '';
    try {
      const [prods, subcats] = await Promise.all([
        api<Product[]>(`/v1/products?categorySlug=${slug}${qs}&limit=100`),
        api<Category[]>(`/v1/categories/${slug}/subcategories${settlement ? `?settlement=${settlement}` : ''}`),
      ]);
      setProducts(prods.filter(p => p.isActive));
      setSubcategories(subcats.filter(s => s.isActive !== false));
      if (prods.length > 0 && prods[0].category) {
        setCategoryName(prods[0].category.name);
      }
    } catch (e) {
      console.error('Failed to load category', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [slug, settlement]);

  const filteredProducts = activeSubcat
    ? products.filter(p => p.subcategoryId === activeSubcat)
    : products;

  if (loading) {
    return (
      <View style={baseStyles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={baseStyles.container}>
      <Stack.Screen options={{ title: categoryName || 'Категория' }} />

      {subcategories.length > 0 && (
        <FlatList
          horizontal
          data={[{ id: '__all', name: 'Все', slug: '' } as Category, ...subcategories]}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.subcatList}
          renderItem={({ item }) => {
            const isActive = item.id === '__all' ? !activeSubcat : activeSubcat === item.id;
            return (
              <TouchableOpacity
                style={[styles.subcatChip, isActive && styles.subcatChipActive]}
                onPress={() => setActiveSubcat(item.id === '__all' ? null : item.id)}
              >
                <Text style={[styles.subcatText, isActive && styles.subcatTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <FlatList
        data={filteredProducts}
        numColumns={2}
        contentContainerStyle={styles.prodList}
        columnWrapperStyle={{ justifyContent: 'space-between' }}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchData();
            }}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.prodCard}
            activeOpacity={0.7}
            onPress={() => router.push(`/product/${item.id}`)}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: mediaUrl(item.imageUrl) }}
                style={styles.prodImage}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.prodImage, styles.placeholder]}>
                <Text style={{ fontSize: 28 }}>📦</Text>
              </View>
            )}
            <View style={styles.prodInfo}>
              <Text style={styles.prodTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.weight && <Text style={styles.prodWeight}>{item.weight}</Text>}
              <View style={[baseStyles.row, { justifyContent: 'space-between', marginTop: 6 }]}>
                <View>
                  <Text style={styles.prodPrice}>{formatPrice(item.price)}</Text>
                  {item.oldPrice && (
                    <Text style={styles.prodOldPrice}>{formatPrice(item.oldPrice)}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    addItem(item.id);
                  }}
                >
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={[baseStyles.centered, { paddingTop: 40 }]}>
            <Text style={baseStyles.subtitle}>Товаров нет</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subcatList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  subcatChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  subcatChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  subcatText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  subcatTextActive: {
    color: Colors.white,
  },
  prodList: {
    padding: 12,
  },
  prodCard: {
    width: '48%',
    backgroundColor: Colors.cardBg,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  prodImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.border,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  prodInfo: {
    padding: 10,
  },
  prodTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    minHeight: 34,
  },
  prodWeight: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  prodPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  prodOldPrice: {
    fontSize: 12,
    color: Colors.textSecondary,
    textDecorationLine: 'line-through',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '600',
    marginTop: -1,
  },
});
