# NexBank Project 🏦

## Stato attuale del progetto (Sprint 1 - PR2)

Il progetto si è evoluto da un semplice test di connessione a un vero e proprio MVP (Minimum Viable Product) per l'onboarding degli utenti. Attualmente il codice implementa il seguente flusso:

1. **Registrazione Utente**: Tramite l'app mobile, un nuovo utente inserisce username e password.
2. **Logica di Business (Backend)**: Il sistema crea l'utente, genera automaticamente un IBAN univoco e gli intesta un "Conto Corrente", assegnando un bonus di benvenuto di 100€.
3. **Dashboard Personale**: Una volta completata la registrazione, l'interfaccia aggiorna il proprio stato e mostra la dashboard bancaria con saldo, IBAN e dettagli del conto in tempo reale.

In sintesi, il progetto ora dimostra una comunicazione end-to-end completa con persistenza dei dati:

- **Database (MySQL)**: Archiviazione relazionale con struttura 1:N tra le tabelle `Utenti` e `Conti`.
- **Backend (FastAPI + Python)**: Esposizione di API RESTful documentate su Swagger (`POST /registrazione` e `GET /dashboard/{id}`). Utilizza SQLAlchemy come ORM.
- **Frontend (React Native + Expo)**: Interfaccia utente cross-platform scritta in TypeScript. Gestisce lo stato dell'app dinamicamente ed effettua chiamate HTTP tramite Axios.

## Obiettivo di questa fase

Questa versione (Project Review 2) certifica la solidità dell'architettura e la capacità di gestire flussi di dati reali:
- Scrittura e lettura di dati relazionali.
- Navigazione condizionale sul frontend basata sullo stato dell'utente.
- Predisposizione dell'ambiente per il core business (trasferimenti P2P e crittografia) previsto per il prossimo Sprint.

## Istruzioni per l'avvio

Per far partire l'intero ecosistema, apri tre terminali separati assicurandoti di essere nelle rispettive cartelle:

### 1. Database
```bash
cd database
docker-compose up -d
```

### 2. Backend
```bash
cd backend
# Attiva l'ambiente virtuale (su Windows)
venv\Scripts\activate.ps1
# Avvia il server locale
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Le API saranno testabili su: http://localhost:8000/docs

### 3. Frontend
```bash
cd frontend
# Avvia il bundler di Expo
npx expo start
```