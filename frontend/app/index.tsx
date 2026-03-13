import React, { useState } from 'react';
import { StyleSheet, Text, View, Button } from 'react-native';
import axios from 'axios';

export default function App() {
  const [messaggio, setMessaggio] = useState("Premi per testare l'architettura");

  const testConnessione = async () => {
    try {
      // ATTENZIONE: Metti l'indirizzo IP del tuo computer, NON usare localhost!
      // Esempio: http://192.168.1.55:8000/ping
      const response = await axios.get('http://192.168.1.179:8000/ping');
      setMessaggio(response.data.status);
    } catch (error) {
      setMessaggio("Errore di rete. Server irraggiungibile.");
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>NexBank PoC</Text>
      <Text style={styles.messageText}>{messaggio}</Text>
      <Button title="Test Connessione DB" onPress={testConnessione} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, color: '#002B5B' },
  messageText: { fontSize: 18, marginBottom: 20, color: '#333' }
});