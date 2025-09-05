import React from 'react';
import { View, Text, StyleSheet, AppRegistry } from 'react-native';

function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Bienvenido a la aplicación</Text>
    </View>
  );
}

AppRegistry.registerComponent('main', () => App);

export default App;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
  },
});