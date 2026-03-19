import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';

// INSERISCI QUI IL TUO IP LOCALE!
const API_BASE_URL = 'http://192.168.1.3:8000/api'; 

// 1. Definiamo la "carta d'identità" dei dati del nostro backend
interface UserData {
  id_utente: number;
  iban: string;
  saldo: number;
  tipo_conto: string;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // 2. Diciamo a TypeScript che userData è "null" oppure "UserData"
  const [userData, setUserData] = useState<UserData | null>(null);

  const registraEAccedi = async () => {
    if (!username || !password) {
      Alert.alert("Errore", "Inserisci username e password.");
      return;
    }

    setLoading(true);
    try {
      const regResponse = await axios.post(`${API_BASE_URL}/registrazione`, {
        username: username,
        password: password
      });
      
      const idUtente = regResponse.data.id_utente;

      const dashResponse = await axios.get(`${API_BASE_URL}/dashboard/${idUtente}`);
      
      setUserData(dashResponse.data);

    } catch (error) {
      // 3. Verifichiamo il tipo di errore per accontentare TypeScript
      if (axios.isAxiosError(error)) {
        const messaggioErrore = error.response?.data?.detail || "Errore di rete. Controlla l'IP.";
        Alert.alert("Attenzione", messaggioErrore);
      } else {
        Alert.alert("Errore Generico", "Si è verificato un errore imprevisto.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>NexBank</Text>
        <Text style={styles.subtitle}>Crea il tuo Conto Corrente</Text>
        
        <TextInput 
          style={styles.input} 
          placeholder="Scegli un Username" 
          placeholderTextColor="#afafaf"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />
        <TextInput 
          style={styles.input} 
          placeholder="Scegli una Password" 
          placeholderTextColor="#afafaf"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true} 
        />

        {loading ? (
          <ActivityIndicator size="large" color="#002B5B" />
        ) : (
          <Button title="Registrati e Accedi" onPress={registraEAccedi} color="#002B5B" />
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ciao, {username}!</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Saldo Disponibile</Text>
        <Text style={styles.saldoText}>€ {userData.saldo.toFixed(2)}</Text>
        
        <View style={styles.ibanContainer}>
          <Text style={styles.ibanLabel}>Il tuo IBAN:</Text>
          <Text style={styles.ibanText}>{userData.iban}</Text>
        </View>
        <Text style={styles.tipoConto}>Conto {userData.tipo_conto}</Text>
      </View>

      <Button title="Esci" onPress={() => setUserData(null)} color="#d9534f" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0f4f8' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 5, color: '#002B5B', textAlign: 'center' },
  subtitle: { fontSize: 16, marginBottom: 30, color: '#666', textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16, textDecorationColor: '#002B5B' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, marginBottom: 30, alignItems: 'center' },
  cardTitle: { fontSize: 16, color: '#666', marginBottom: 10 },
  saldoText: { fontSize: 40, fontWeight: 'bold', color: '#28a745', marginBottom: 20 },
  ibanContainer: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, width: '100%', alignItems: 'center' },
  ibanLabel: { fontSize: 12, color: '#888' },
  ibanText: { fontSize: 14, fontWeight: 'bold', color: '#333', letterSpacing: 1, marginTop: 5 },
  tipoConto: { marginTop: 15, fontSize: 14, color: '#002B5B', fontWeight: '500' }
});