# NexBank Project

## Stato attuale del progetto

Al momento il codice implementa questo flusso base:

1. Il backend si connette al database ed esegue un ping per verificare che sia raggiungibile.
2. Se il ping ha successo, il backend prepara un messaggio di conferma.
3. Il frontend riceve il messaggio dal backend e lo mostra all'utente.

In sintesi, il progetto ora dimostra la comunicazione end-to-end tra i tre livelli principali:

- Database: risponde al ping.
- Backend: verifica la connessione e inoltra il risultato.
- Frontend: visualizza il messaggio ricevuto.

## Obiettivo di questa fase

Questa versione serve a validare che l'infrastruttura minima sia funzionante:

- collegamento backend <-> database
- collegamento frontend <-> backend

Da qui si puo poi estendere la logica applicativa (autenticazione, operazioni bancarie, gestione utenti, ecc.).
