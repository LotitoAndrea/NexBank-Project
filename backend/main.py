import random
import jwt
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, DateTime, func, or_, desc
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import JWTError, jwt

# Configurazione connessione al DB
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/nexbank"
SECRET_KEY = "chiave_super_segreta_nexbank_cambiami" # In un'app vera andrebbe nascosta in un file .env!
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 # Il token scade dopo 1 ora


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/login")

# ==========================================
# MODELLI DEL DATABASE
# ==========================================

class Utente(Base):
    __tablename__ = "utenti"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    
    conti = relationship("Conto", back_populates="proprietario", cascade="all, delete-orphan")
    # Relazione per vedere i bonifici inviati dall'utente
    transazioni_effettuate = relationship("Transazione", back_populates="mittente")

class Conto(Base):
    __tablename__ = "conti"
    id = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id"), nullable=False)
    iban = Column(String(27), unique=True, nullable=False)
    tipo_conto = Column(String(20), default="Corrente")
    saldo = Column(Float, default=0.0)
    
    proprietario = relationship("Utente", back_populates="conti")

# --- NUOVA TABELLA TRANSAZIONI ---
class Transazione(Base):
    __tablename__ = "transazioni"
    id = Column(Integer, primary_key=True, index=True)
    id_utente_mittente = Column(Integer, ForeignKey("utenti.id"), nullable=False)
    iban_destinatario = Column(String(27), nullable=False)
    importo = Column(Float, nullable=False)
    causale = Column(String(100), default="Bonifico")
    data_ora = Column(DateTime, server_default=func.now()) # Imposta l'ora attuale del server

    mittente = relationship("Utente", back_populates="transazioni_effettuate")

# Crea le tabelle nel DB (inclusa la nuova Transazione)
Base.metadata.create_all(bind=engine)

# ==========================================
# SCHEMI PYDANTIC
# ==========================================

class UtenteRegistrazione(BaseModel):
    username: str
    password: str

class UtenteLogin(BaseModel):
    username: str
    password: str

# --- NUOVO SCHEMA PER IL BONIFICO ---
class BonificoEsecuzione(BaseModel):
    id_utente_mittente: int
    iban_destinatario: str
    importo: float
    causale: str = "Bonifico"

# ==========================================
# CONFIGURAZIONE APP E DIPENDENZE
# ==========================================

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password: str):
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Impossibile validare le credenziali",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # Decodifichiamo il token JWT
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub") # "sub" di solito contiene lo username o l'ID
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    # Cerchiamo l'utente nel database
    user = db.query(Utente).filter(Utente.username == username).first()
    if user is None:
        raise credentials_exception
    return user

# ==========================================
# ROTTE API (Registrazione, Login, Dashboard)
# ==========================================

@app.get("/")
def read_root():
    return {"messaggio": "NexBank Backend - PR3: Modello Transazioni Caricato"}

@app.post("/api/registrazione")
def registra_utente(dati: UtenteRegistrazione, db: Session = Depends(get_db)):
    # 1. Controllo se l'utente esiste già
    utente_esistente = db.query(Utente).filter(Utente.username == dati.username).first()
    if utente_esistente:
        raise HTTPException(status_code=400, detail="Username già in uso")
    
    # 2. Criptiamo la password usando 'dati.password'
    password_criptata = get_password_hash(dati.password)

    # 3. Salviamo l'utente passandogli la password criptata!
    nuovo_utente = Utente(username=dati.username, password=password_criptata)
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente)
    
    # 4. Creazione del conto
    import random # Assicurati di aver importato random in alto nel file
    iban_finto = f"IT{random.randint(10,99)}NEX{random.randint(100000,999999)}"
    nuovo_conto = Conto(id_utente=nuovo_utente.id, iban=iban_finto, saldo=100.0)
    db.add(nuovo_conto)
    db.commit()
    
    return {"id_utente": nuovo_utente.id, "iban_generato": iban_finto}

@app.post("/api/login")
def login_utente(dati_login: UtenteLogin, db: Session = Depends(get_db)):
    # 1. Cerchiamo l'utente nel database
    utente_db = db.query(Utente).filter(Utente.username == dati_login.username).first()
    
    # 2. NUOVO: Invece di confrontare le stringhe, usiamo verify_password per confrontare l'hash!
    if not utente_db or not verify_password(dati_login.password, utente_db.password):
        raise HTTPException(status_code=401, detail="Credenziali errate")

    # 3. NUOVO: Le credenziali sono corrette, quindi generiamo il Token JWT
    token_data = {"sub": utente_db.username, "id": utente_db.id}
    access_token = create_access_token(data=token_data)

    # 4. AGGIORNATO: Restituiamo il token al frontend (manteniamo anche id_utente perché la tua app React Native lo usa ancora per le altre chiamate)
    return {
        "messaggio": "Login effettuato con successo",
        "id_utente": utente_db.id,
        "access_token": access_token,
        "token_type": "bearer"
    }

@app.get("/api/dashboard/{utente_id}")
def get_dashboard(utente_id: int, db: Session = Depends(get_db)):
    conto = db.query(Conto).filter(Conto.id_utente == utente_id).first()
    if not conto:
        raise HTTPException(status_code=404, detail="Conto non trovato")
    return {"id_utente": utente_id, "iban": conto.iban, "saldo": conto.saldo, "tipo_conto": conto.tipo_conto}

@app.post("/api/bonifico")
def esegui_bonifico(
    dati: BonificoEsecuzione, 
    db: Session = Depends(get_db),
    current_user: Utente = Depends(get_current_user)
    ):
    # 1. MODIFICATO: Cerchiamo il conto usando l'ID dell'utente LOGGATO, non quello nel JSON
    conto_mittente = db.query(Conto).filter(Conto.id_utente == current_user.id).first()
    
    if not conto_mittente:
        raise HTTPException(status_code=404, detail="Il tuo conto non è stato trovato")
    
    # 2. Controlli di sicurezza di base
    if dati.importo <= 0:
        raise HTTPException(status_code=400, detail="L'importo deve essere maggiore di zero")
    if conto_mittente.saldo < dati.importo:
        raise HTTPException(status_code=400, detail="Fondi insufficienti")

    # 3. Troviamo il conto del destinatario tramite il suo IBAN
    conto_destinatario = db.query(Conto).filter(Conto.iban == dati.iban_destinatario).first()
    if not conto_destinatario:
        raise HTTPException(status_code=404, detail="IBAN destinatario inesistente")

    # 4. Evitiamo che uno si faccia un bonifico da solo
    if conto_mittente.iban == conto_destinatario.iban:
        raise HTTPException(status_code=400, detail="Non puoi inviare denaro a te stesso")

    # 5. ESECUZIONE DELLA TRANSAZIONE (Il blocco try/except è vitale qui)
    try:
        # A. Scaliamo i soldi al mittente
        conto_mittente.saldo -= dati.importo
        
        # B. Aggiungiamo i soldi al destinatario
        conto_destinatario.saldo += dati.importo

        # C. Registriamo il movimento nel "libro mastro" (Tabella Transazioni)
        nuova_transazione = Transazione(
            id_utente_mittente=dati.id_utente_mittente,
            iban_destinatario=dati.iban_destinatario,
            importo=dati.importo,
            causale=dati.causale
        )
        db.add(nuova_transazione)

        # D. Salviamo TUTTO insieme in modo definitivo
        db.commit()
        db.refresh(nuova_transazione)

        return {
            "messaggio": "Bonifico completato con successo!",
            "id_transazione": nuova_transazione.id,
            "nuovo_saldo_mittente": conto_mittente.saldo
        }

    except Exception as e:
        # Se c'è un errore qualsiasi (es. cade la connessione al DB), annulliamo TUTTO
        db.rollback()
        raise HTTPException(status_code=500, detail="Errore interno durante il trasferimento")
    
@app.get("/api/transazioni/{utente_id}")
def get_storico_transazioni(utente_id: int, db: Session = Depends(get_db)):
    # 1. Trovo il conto dell'utente per recuperare il suo IBAN
    conto_utente = db.query(Conto).filter(Conto.id_utente == utente_id).first()
    if not conto_utente:
        raise HTTPException(status_code=404, detail="Conto non trovato")

    # 2. Cerco tutte le transazioni dove l'utente è MITTENTE oppure DESTINATARIO
    transazioni_db = db.query(Transazione).filter(
        or_(
            Transazione.id_utente_mittente == utente_id,
            Transazione.iban_destinatario == conto_utente.iban
        )
    ).order_by(desc(Transazione.data_ora)).all() # Le ordiniamo dalla più recente!

    # 3. Formattiamo i dati per facilitare la vita al Frontend
    storico = []
    for t in transazioni_db:
        if t.id_utente_mittente == utente_id:
            # È un bonifico in USCITA (hai inviato tu i soldi)
            tipo = "USCITA"
            iban_controparte = t.iban_destinatario
        else:
            # È un bonifico in ENTRATA (hai ricevuto i soldi)
            tipo = "ENTRATA"
            # Andiamo a scovare l'IBAN di chi ti ha mandato i soldi
            conto_mittente = db.query(Conto).filter(Conto.id_utente == t.id_utente_mittente).first()
            iban_controparte = conto_mittente.iban if conto_mittente else "Sconosciuto"

        # Creiamo un "pacchetto" pulito per ogni riga della lista
        storico.append({
            "id": t.id,
            "tipo": tipo,
            "importo": t.importo,
            "iban_controparte": iban_controparte,
            "causale": t.causale,
            # Formattiamo la data in un formato europeo leggibile (es. 12/04/2026 15:30)
            "data": t.data_ora.strftime("%d/%m/%Y %H:%M") 
        })

    return storico

