import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/contexts/AuthContext';

export default function HorariosScreen() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuth();

  const handleAddTurno = () => {
    if (isAuthenticated) {
      Alert.alert('Información', 'Función no implementada todavía');
    } else {
      Alert.alert('Error', 'Necesitas iniciar sesión para añadir turnos');
    }
  };

  const handleLoginPress = () => {
    // No longer needed - login will show automatically when not authenticated
    Alert.alert('Información', 'El login aparece automáticamente cuando no hay sesión activa');
  };

  const handleLogoutPress = () => {
    logout();
    Alert.alert('Sesión cerrada', 'Has cerrado sesión exitosamente');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.centeredText}>
        Pantalla de Horarios
      </ThemedText>

      {isAuthenticated ? (
        <ThemedView style={styles.userInfo}>
          <ThemedText style={styles.welcomeText}>
            ¡Bienvenido, {user?.email}!
          </ThemedText>
          <ThemedText style={styles.roleText}>
            Rol: {user?.role}
          </ThemedText>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleAddTurno}
          >
            <ThemedText style={styles.buttonText}>
              Añadir turno
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.logoutButton]}
            onPress={handleLogoutPress}
          >
            <ThemedText style={styles.buttonText}>
              Cerrar sesión
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      ) : (
        <ThemedView style={styles.authPrompt}>
          <ThemedText style={styles.promptText}>
            Inicia sesión para acceder a las funciones de horarios
          </ThemedText>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={handleLoginPress}
          >
            <ThemedText style={styles.buttonText}>
              Iniciar sesión
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  centeredText: {
    textAlign: 'center',
    marginBottom: 30,
  },
  userInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  roleText: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
  },
  authPrompt: {
    alignItems: 'center',
    padding: 20,
  },
  promptText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
