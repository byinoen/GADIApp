import { StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen({ navigation }) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.centeredText}>
        Pantalla principal
      </ThemedText>
      <TouchableOpacity 
        style={styles.button}
        onPress={() => navigation.navigate('WorkSchedules')}
      >
        <ThemedText style={styles.buttonText}>
          Ir a Horarios de trabajo
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
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
  },
});