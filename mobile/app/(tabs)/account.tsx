import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { Colors, baseStyles } from '@/lib/theme';

export default function AccountScreen() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <View style={baseStyles.centered}>
        <Text style={{ fontSize: 48, marginBottom: 12 }}>👤</Text>
        <Text style={baseStyles.title}>Личный кабинет</Text>
        <Text style={[baseStyles.subtitle, { marginTop: 4, marginBottom: 20 }]}>
          Войдите или зарегистрируйтесь
        </Text>
        <TouchableOpacity
          style={[baseStyles.button, { paddingHorizontal: 32, marginBottom: 10 }]}
          onPress={() => router.push('/login')}
        >
          <Text style={baseStyles.buttonText}>Войти</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/register')}>
          <Text style={styles.link}>Создать аккаунт</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={baseStyles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={baseStyles.subtitle}>{user.settlementTitle}</Text>
      </View>

      <View style={baseStyles.card}>
        <InfoRow label="Логин" value={user.login} />
        <InfoRow label="Телефон" value={user.phone} />
        <InfoRow label="Адрес" value={user.addressLine} />
      </View>

      <TouchableOpacity
        style={[baseStyles.button, { marginHorizontal: 16, marginTop: 20, backgroundColor: Colors.danger }]}
        onPress={async () => {
          await logout();
        }}
      >
        <Text style={baseStyles.buttonText}>Выйти</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  link: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
});
