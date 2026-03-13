from fastapi import FastAPI
from fastapi import status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.exc import SQLAlchemyError

# Configurazione connessione al DB MySQL su Docker
DATABASE_URL = "mysql+pymysql://root:root@localhost:3306/nexbank"

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Definizione della tabella di Test (L'ORM in azione)
class TestMessage(Base):
    __tablename__ = "test_table"
    id = Column(Integer, primary_key=True, index=True)
    message = Column(String(50))

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
    try:
        Base.metadata.create_all(bind=engine)

        db = SessionLocal()
        if not db.query(TestMessage).first():
            db.add(TestMessage(message="Connessione Banca OK"))
            db.commit()
        db.close()
    except SQLAlchemyError:
        # Se il DB non e raggiungibile all'avvio, il backend rimane comunque attivo.
        # La rotta /ping gestira il messaggio di errore.
        return

# La rotta richiamata da React Native
@app.get("/ping")
def ping():
    try:
        db = SessionLocal()
        msg = db.query(TestMessage).first()
        db.close()
        return {"ok": True, "status": msg.message if msg else "DB raggiungibile ma senza dati"}
    except SQLAlchemyError:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"ok": False, "status": "Backend OK ma non comunica con il database"},
        )