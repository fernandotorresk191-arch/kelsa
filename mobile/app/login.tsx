import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Colors, baseStyles } from '@/lib/theme';

export default function LoginScreen() {
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    setBusy(true);
    try {
      await auth.login(login.trim(), password);
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка входа', 'Неверный логин или пароль');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={baseStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 40 }}>
        <Text style={[baseStyles.title, { textAlign: 'center', marginBottom: 8 }]}>Kelsa</Text>
        <Text style={[baseStyles.subtitle, { textAlign: 'center', marginBottom: 32 }]}>
          Войдите в аккаунт
        </Text>

        <TextInput
          style={baseStyles.input}
          placeholder="Логин"
          placeholderTextColor={Colors.textSecondary}
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Пароль"
          placeholderTextColor={Colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[baseStyles.button, { marginTop: 8, opacity: busy ? 0.6 : 1 }]}
          onPress={handleLogin}
          disabled={busy}
        >
          <Text style={baseStyles.buttonText}>{busy ? 'Вход...' : 'Войти'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 16, alignItems: 'center' }}
          onPress={() => {
            router.back();
            router.push('/register');
          }}
        >
          <Text style={{ color: Colors.primary, fontSize: 15, fontWeight: '600' }}>
            Создать аккаунт
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
