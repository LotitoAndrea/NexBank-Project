import random
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, Session
from pydantic import BaseModel

# Configurazione connessione al DB MySQL su Docker
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/nexbank"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# MODELLI DEL DATABASE (Fase 1)
# ==========================================

class Utente(Base):
    __tablename__ = "utenti"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False) # In chiaro per ora (Sprint 1)
    
    # Relazione verso i conti: se cancello l'utente, cancello i suoi conti (cascade)
    conti = relationship("Conto", back_populates="proprietario", cascade="all, delete-orphan")

class Conto(Base):
    __tablename__ = "conti"
    
    id = Column(Integer, primary_key=True, index=True)
    id_utente = Column(Integer, ForeignKey("utenti.id"), nullable=False)
    iban = Column(String(27), unique=True, nullable=False)
    tipo_conto = Column(String(20), default="Corrente")
    saldo = Column(Float, default=0.0)
    
    # Relazione inversa verso l'utente
    proprietario = relationship("Utente", back_populates="conti")

# Crea le tabelle nel DB all'avvio
Base.metadata.create_all(bind=engine)

# ==========================================
# CONFIGURAZIONE APP E CORS
# ==========================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ROTTE API (Le riempiremo nella Fase 2)
# ==========================================

@app.get("/")
def read_root():
    return {"messaggio": "Backend NexBank Attivo - Modelli DB Caricati"}

# ==========================================
# SCHEMI PYDANTIC (Validazione input)
# ==========================================
class UtenteRegistrazione(BaseModel):
    username: str
    password: str

# Dipendenza per ottenere la sessione del DB
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==========================================
# ROTTE API REST (Fase 2)
# ==========================================

@app.post("/api/registrazione")
def registra_utente(dati: UtenteRegistrazione, db: Session = Depends(get_db)):
    # 1. Controllo se l'username esiste già
    utente_esistente = db.query(Utente).filter(Utente.username == dati.username).first()
    if utente_esistente:
        raise HTTPException(status_code=400, detail="Username già in uso")
    
    # 2. Creo il nuovo utente
    nuovo_utente = Utente(username=dati.username, password=dati.password)
    db.add(nuovo_utente)
    db.commit()
    db.refresh(nuovo_utente) # Serve per farsi restituire l'ID appena generato dal DB
    
    # 3. Creo il Conto Corrente associato con 100€ di bonus
    iban_finto = f"IT{random.randint(10,99)}NEX{random.randint(100000,999999)}"
    nuovo_conto = Conto(id_utente=nuovo_utente.id, iban=iban_finto, saldo=100.0)
    db.add(nuovo_conto)
    db.commit()
    
    return {
        "messaggio": "Registrazione completata con successo", 
        "id_utente": nuovo_utente.id,
        "iban_generato": iban_finto
    }

@app.get("/api/dashboard/{utente_id}")
def get_dashboard(utente_id: int, db: Session = Depends(get_db)):
    # Cerco il conto associato a quell'ID utente
    conto = db.query(Conto).filter(Conto.id_utente == utente_id).first()
    
    if not conto:
        raise HTTPException(status_code=404, detail="Conto non trovato")
        
    return {
        "id_utente": utente_id,
        "iban": conto.iban,
        "saldo": conto.saldo,
        "tipo_conto": conto.tipo_conto
    }

# Qui sotto, nel prossimo step, creeremo:
# @app.post("/api/registrazione")
# @app.get("/api/dashboard/{utente_id}")