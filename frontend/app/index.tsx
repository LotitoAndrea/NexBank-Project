import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, Alert, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import axios from 'axios';
// 1. IMPORTIAMO ASYNC STORAGE
import AsyncStorage from '@react-native-async-storage/async-storage';

// INSERISCI QUI IL TUO IP LOCALE! (Assicurati che sia quello del PC)
const API_BASE_URL = 'http://192.168.1.10:8000/api'; 

interface UserData {
  id_utente: number;
  iban: string;
  saldo: number;
  tipo_conto: string;
}

interface Transazione {
  id: number;
  tipo: string;
  importo: number;
  iban_controparte: string;
  causale: string;
  data: string;
}

export default function App() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [storico, setStorico] = useState<Transazione[]>([]);
  const [ibanDestinatario, setIbanDestinatario] = useState<string>(''); 
  const [importoBonifico, setImportoBonifico] = useState<string>('');

  // 2. CONTROLLO AUTOMATICO AL CARICAMENTO
  useEffect(() => {
    const verificaSessione = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        console.log("Esiste un token salvato, l'utente era già loggato!");
        // Per ora facciamo solo il log, in futuro potremmo saltare il login
      }
    };
    verificaSessione();
  }, []);

  const caricaStorico = async (idUtente: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/transazioni/${idUtente}`);
      setStorico(response.data);
    } catch (error) {
      console.log("Errore nel caricamento dello storico:", error);
    }
  };

  // 3. FUNZIONE ACCEDI AGGIORNATA PER IL TOKEN
  const accedi = async () => {
    if (!username || !password) {
      Alert.alert("Errore", "Inserisci username e password.");
      return;
    }
    setLoading(true);
    try {
      // Chiamata POST /api/login per ricevere il Token JWT
      const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
        username: username,
        password: password
      });

      // SALVATAGGIO TOKEN: Prendiamo il token dal JSON e lo salviamo nel telefono
      const token = loginResponse.data.access_token;
      await AsyncStorage.setItem('userToken', token);
      
      const idUtente = loginResponse.data.id_utente;
      console.log("Login successo! Token salvato. ID Utente:", idUtente);

      // Carichiamo i dati della dashboard
      const dashResponse = await axios.get(`${API_BASE_URL}/dashboard/${idUtente}`);
      setUserData(dashResponse.data);

      // Carichiamo lo storico
      await caricaStorico(idUtente);

    } catch (error: any) {
      console.log("Errore Login:", error);
      Alert.alert("Attenzione", error.response?.data?.detail || "Credenziali errate o server offline.");
    } finally {
      setLoading(false);
    }
  };

  // 4. REGISTRAZIONE (Modificata per coerenza)
  const registraEAccedi = async () => {
    if (!username || !password) {
      Alert.alert("Errore", "Inserisci username e password.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/registrazione`, {
        username: username,
        password: password
      });
      
      Alert.alert("Ottimo!", "Registrazione completata. Ora effettuo l'accesso...");
      // Dopo la registrazione, chiamiamo la funzione accedi() per prendere il token
      await accedi();

    } catch (error: any) {
      Alert.alert("Errore", error.response?.data?.detail || "Errore durante la registrazione.");
    } finally {
      setLoading(false);
    }
  };

const inviaBonifico = async () => {
  if (!ibanDestinatario || !importoBonifico || !userData) {
    Alert.alert("Errore", "Compila tutti i campi!");
    return;
  }

  try {
    // RECUPERIAMO IL TOKEN SALVATO
    const token = await AsyncStorage.getItem('userToken');

    const payload = {
      // In un sistema pro, l'id mittente lo prende il server dal token, 
      // ma per ora manteniamolo per compatibilità col tuo backend attuale
      id_utente_mittente: userData.id_utente, 
      iban_destinatario: ibanDestinatario,
      importo: parseFloat(importoBonifico),
      causale: "Bonifico sicuro con Token"
    };

    const response = await axios.post(`${API_BASE_URL}/bonifico`, payload, {
      headers: {
        // AGGIUNGIAMO IL TOKEN QUI!
        'Authorization': `Bearer ${token}`
      }
    });

    Alert.alert("Successo! 🚀", response.data.messaggio);
    
    setUserData(prevData => prevData ? { ...prevData, saldo: response.data.nuovo_saldo_mittente } : null);
    setImportoBonifico(''); 
    setIbanDestinatario('');
    await caricaStorico(userData.id_utente);

  } catch (error: any) {
    console.log("Errore Bonifico:", error.response?.data);
    Alert.alert("Bonifico Fallito", error.response?.data?.detail || "Errore di sicurezza.");
  }
};

  // 5. LOGOUT AGGIORNATO (PULISCE TUTTO)
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken'); // Rimuoviamo il token dal telefono
    setUserData(null);
    setStorico([]);
    setUsername('');
    setPassword('');
    Alert.alert("Logout", "Sessione chiusa correttamente.");
  };

  // UI - SCHERMATA LOGIN
  if (!userData) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>NexBank</Text>
        <Text style={styles.subtitle}>Accedi o Crea un Conto</Text>
        <TextInput style={styles.input} placeholder="Username" placeholderTextColor="#afafaf" value={username} onChangeText={setUsername} autoCapitalize="none" />
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#afafaf" value={password} onChangeText={setPassword} secureTextEntry={true} />
        {loading ? (
          <ActivityIndicator size="large" color="#002B5B" />
        ) : (
          <View style={{ gap: 15, marginTop: 10 }}>
            <Button title="Accedi" onPress={accedi} color="#002B5B" />
            <Button title="Registrati" onPress={registraEAccedi} color="#28a745" />
          </View>
        )}
      </View>
    );
  }

  // UI - SCHERMATA DASHBOARD
  return (
    <ScrollView contentContainerStyle={styles.containerScroll}>
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

      <View style={styles.bonificoCard}>
        <Text style={styles.bonificoTitle}>Invia Denaro (P2P)</Text>
        <Text style={styles.inputLabel}>IBAN Destinatario</Text>
        <TextInput style={styles.input} value={ibanDestinatario} onChangeText={setIbanDestinatario} placeholder="Es. IT88NEX..." autoCapitalize="characters" />
        <Text style={styles.inputLabel}>Importo (€)</Text>
        <TextInput style={styles.input} value={importoBonifico} onChangeText={setImportoBonifico} placeholder="Es. 50.00" keyboardType="numeric" />
        <View style={{ marginTop: 10 }}>
          <Button title="CONFERMA BONIFICO" onPress={inviaBonifico} color="#002D62" />
        </View>
      </View>

      <View style={styles.storicoContainer}>
        <Text style={styles.storicoTitle}>Ultimi Movimenti</Text>
        {storico.length === 0 ? (
          <Text style={styles.nessunaTransazione}>Nessuna transazione recente.</Text>
        ) : (
          storico.map((tx) => (
            <TouchableOpacity key={tx.id} style={styles.txCard} onPress={() => setIbanDestinatario(tx.iban_controparte)}>
              <View style={styles.txHeader}>
                <Text style={styles.txCausale}>{tx.causale}</Text>
                <Text style={[styles.txImporto, { color: tx.tipo === 'ENTRATA' ? '#28a745' : '#d9534f' }]}>
                  {tx.tipo === 'ENTRATA' ? '+' : '-'}€{tx.importo.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.txControparte}>IBAN: {tx.iban_controparte}</Text>
              <View style={styles.txFooter}>
                <Text style={styles.txData}>{tx.data}</Text>
                <Text style={styles.txUsaIban}>Tap per usare IBAN 👇</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ marginTop: 30 }}>
        <Button title="Esci (Logout)" onPress={handleLogout} color="#d9534f" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f0f4f8' },
  containerScroll: { flexGrow: 1, padding: 20, backgroundColor: '#f0f4f8', paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 5, color: '#002B5B', textAlign: 'center', marginTop: 40 },
  subtitle: { fontSize: 16, marginBottom: 30, color: '#666', textAlign: 'center' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 16 },
  inputLabel: { fontSize: 12, color: 'gray', marginBottom: 5, fontWeight: 'bold' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 5, marginBottom: 20, alignItems: 'center' },
  cardTitle: { fontSize: 16, color: '#666', marginBottom: 10 },
  saldoText: { fontSize: 40, fontWeight: 'bold', color: '#28a745', marginBottom: 20 },
  ibanContainer: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, width: '100%', alignItems: 'center' },
  ibanLabel: { fontSize: 12, color: '#888' },
  ibanText: { fontSize: 14, fontWeight: 'bold', color: '#333', letterSpacing: 1, marginTop: 5 },
  tipoConto: { marginTop: 15, fontSize: 14, color: '#002B5B', fontWeight: '500' },
  bonificoCard: { backgroundColor: '#e2e8f0', padding: 20, borderRadius: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3, marginBottom: 20 },
  bonificoTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#002D62', textAlign: 'center' },
  storicoContainer: { marginTop: 10 },
  storicoTitle: { fontSize: 18, fontWeight: 'bold', color: '#002B5B', marginBottom: 10, marginLeft: 5 },
  nessunaTransazione: { textAlign: 'center', color: '#888', fontStyle: 'italic', marginTop: 10 },
  txCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: '#eee' },
  txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  txCausale: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  txImporto: { fontSize: 16, fontWeight: 'bold' },
  txControparte: { fontSize: 12, color: '#555', marginBottom: 8 },
  txFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  txData: { fontSize: 11, color: '#999' },
  txUsaIban: { fontSize: 11, color: '#007BFF', fontWeight: 'bold' }
});