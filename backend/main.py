from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

# Configurazione connessione al DB MySQL su Docker
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/nexbank"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Definizione della tabella di Test (L'ORM in azione)
class TestMessage(Base):
    __tablename__ = "test_table"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(50))

# Crea le tabelle nel DB all'avvio
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Risolve i blocchi di sicurezza tra App ed Emulatore
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inseriamo il dato fittizio all'avvio (se non c'è già)
@app.on_event("startup")
def startup():
    db = SessionLocal()
    if not db.query(TestMessage).first():
        db.add(TestMessage(message="Connessione Banca OK"))
        db.commit()
    db.close()

# La rotta richiamata da React Native
@app.get("/ping")
def ping():
    db = SessionLocal()
    msg = db.query(TestMessage).first()
    db.close()
    return {"status": msg.message if msg else "Errore DB"}