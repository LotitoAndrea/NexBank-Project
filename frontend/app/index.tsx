import React, { useState } from 'react';
import { StyleSheet, Text, View, Button, Platform } from 'react-native';
import axios from 'axios';

export default function App() {
  const [messaggio, setMessaggio] = useState("Premi per testare l'architettura");

  const apiBaseUrl =
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    (Platform.OS === 'web' ? 'http://localhost:8000' : 'http://192.168.1.179:8000');

  const testConnessione = async () => {
    try {
      const response = await axios.get(`${apiBaseUrl}/ping`, { timeout: 8000 });
      const statusText = response?.data?.status ?? 'Risposta non valida dal backend.';
      setMessaggio(statusText);
    } catch (error) {
      const err = error as any;

      if (err?.response) {
        const httpStatus = err.response.status;
        const serverStatus = err.response?.data?.status;

        if (serverStatus) {
          setMessaggio(serverStatus);
          return;
        }

        if (httpStatus >= 500) {
          setMessaggio('Backend raggiungibile, ma non comunica con il database (errore server).');
          return;
        }

        setMessaggio(`Errore dal backend (HTTP ${httpStatus}).`);
        return;
      }

      setMessaggio('Errore di rete: backend irraggiungibile.');
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