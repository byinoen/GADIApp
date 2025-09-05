import { StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HorariosScreen() {
  const handleAddTurno = () => {
    Alert.alert('Información', 'Función no implementada todavía');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.centeredText}>
        Pantalla de Horarios
      </ThemedText>
      <TouchableOpacity 
        style={styles.button}
        onPress={handleAddTurno}
      >
        <ThemedText style={styles.buttonText}>
          Añadir turno
        </ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredText: {
    textAlign: 'center',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
});
