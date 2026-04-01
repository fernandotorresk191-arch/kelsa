import { Stack } from 'expo-router';
import { AuthProvider } from '@/lib/auth';
import { CartProvider } from '@/lib/cart';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <AuthProvider>
      <CartProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: Colors.white },
            headerTintColor: Colors.text,
            headerTitleStyle: { fontWeight: '600' },
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: 'Вход', presentation: 'modal' }} />
          <Stack.Screen name="register" options={{ title: 'Регистрация', presentation: 'modal' }} />
          <Stack.Screen name="product/[id]" options={{ title: 'Товар' }} />
          <Stack.Screen name="category/[slug]" options={{ title: 'Категория' }} />
          <Stack.Screen name="checkout" options={{ title: 'Оформление заказа' }} />
          <Stack.Screen name="order/[orderNumber]" options={{ title: 'Заказ' }} />
        </Stack>
      </CartProvider>
    </AuthProvider>
  );
}
