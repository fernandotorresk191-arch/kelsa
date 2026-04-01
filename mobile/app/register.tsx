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
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Colors, baseStyles } from '@/lib/theme';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    login: '',
    password: '',
    name: '',
    phone: '',
    email: '',
    addressLine: '',
    settlement: '',
  });
  const [busy, setBusy] = useState(false);
  const auth = useAuth();
  const router = useRouter();

  const update = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));

  const handleRegister = async () => {
    const { login, password, name, phone, email, addressLine } = form;
    if (!login.trim() || !password.trim() || !name.trim() || !phone.trim() || !email.trim()) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Ошибка', 'Пароль минимум 6 символов');
      return;
    }

    const settlement = form.settlement || (auth.settlements[0]?.code ?? '');

    setBusy(true);
    try {
      await auth.register({
        login: login.trim(),
        password,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        settlement,
        addressLine: addressLine.trim(),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Ошибка регистрации', e.message ?? 'Попробуйте другой логин');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={baseStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 20 }}>
        <Text style={[baseStyles.title, { textAlign: 'center', marginBottom: 24 }]}>
          Регистрация
        </Text>

        <TextInput
          style={baseStyles.input}
          placeholder="Логин *"
          placeholderTextColor={Colors.textSecondary}
          value={form.login}
          onChangeText={v => update('login', v)}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Пароль * (мин. 6 символов)"
          placeholderTextColor={Colors.textSecondary}
          value={form.password}
          onChangeText={v => update('password', v)}
          secureTextEntry
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Имя *"
          placeholderTextColor={Colors.textSecondary}
          value={form.name}
          onChangeText={v => update('name', v)}
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
          placeholder="Email *"
          placeholderTextColor={Colors.textSecondary}
          value={form.email}
          onChangeText={v => update('email', v)}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={baseStyles.input}
          placeholder="Адрес доставки"
          placeholderTextColor={Colors.textSecondary}
          value={form.addressLine}
          onChangeText={v => update('addressLine', v)}
        />

        {auth.settlements.length > 0 && (
          <View style={styles.settlements}>
            <Text style={styles.settLabel}>Населённый пункт:</Text>
            {auth.settlements.map(s => (
              <TouchableOpacity
                key={s.code}
                style={[
                  styles.settOption,
                  (form.settlement || auth.settlements[0]?.code) === s.code && styles.settActive,
                ]}
                onPress={() => update('settlement', s.code)}
              >
                <Text
                  style={[
                    styles.settText,
                    (form.settlement || auth.settlements[0]?.code) === s.code && styles.settTextActive,
                  ]}
                >
                  {s.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[baseStyles.button, { marginTop: 16, opacity: busy ? 0.6 : 1 }]}
          onPress={handleRegister}
          disabled={busy}
        >
          <Text style={baseStyles.buttonText}>{busy ? 'Создание...' : 'Зарегистрироваться'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ marginTop: 16, alignItems: 'center' }}
          onPress={() => {
            router.back();
            router.push('/login');
          }}
        >
          <Text style={{ color: Colors.primary, fontSize: 15, fontWeight: '600' }}>
            Уже есть аккаунт? Войти
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  settlements: {
    marginBottom: 8,
  },
  settLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  settOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 6,
  },
  settActive: {
    borderColor: Colors.primary,
    backgroundColor: '#f0fdf4',
  },
  settText: {
    fontSize: 15,
    color: Colors.text,
  },
  settTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
