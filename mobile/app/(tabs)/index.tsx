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
import { useRouter } from 'expo-router';
import { api, mediaUrl } from '@/lib/api';
import type { Category } from '@/lib/types';
import { Colors, baseStyles } from '@/lib/theme';
import { useAuth } from '@/lib/auth';

export default function CatalogScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const settlement = user?.settlement ?? '';

  const fetchCategories = async () => {
    try {
      const qs = settlement ? `?settlement=${settlement}` : '';
      const data = await api<Category[]>(`/v1/categories${qs}`);
      setCategories(data.filter(c => c.isActive !== false));
    } catch (e) {
      console.error('Failed to load categories', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [settlement]);

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
        data={categories}
        numColumns={2}
        contentContainerStyle={styles.list}
        columnWrapperStyle={styles.row}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchCategories();
            }}
            tintColor={Colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => router.push(`/category/${item.slug}`)}
          >
            {item.imageUrl ? (
              <Image
                source={{ uri: mediaUrl(item.imageUrl) }}
                style={styles.image}
                contentFit="cover"
                transition={200}
              />
            ) : (
              <View style={[styles.image, styles.placeholder]}>
                <Text style={styles.placeholderText}>🏷️</Text>
              </View>
            )}
            <Text style={styles.name} numberOfLines={2}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={baseStyles.centered}>
            <Text style={baseStyles.subtitle}>Категории не найдены</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 12,
  },
  row: {
    justifyContent: 'space-between',
  },
  card: {
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
  image: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.border,
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 36,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    padding: 10,
  },
});
