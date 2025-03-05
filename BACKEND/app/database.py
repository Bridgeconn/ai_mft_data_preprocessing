from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import urllib
import os
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from db_models import Base



postgres_host = os.environ.get("HACKATHON_POSTGRES_HOST", "localhost")
postgres_user = os.environ.get("HACKATHON_POSTGRES_USER", "postgres")
postgres_database = os.environ.get("HACKATHON_POSTGRES_DATABASE", "vachan_hackathon")
postgres_password = os.environ.get("HACKATHON_POSTGRES_PASSWORD", "secret")
postgres_port = os.environ.get("HACKATHON_POSTGRES_PORT", "5432")

encoded_password = urllib.parse.quote(postgres_password, safe="")


DATABASE_URL = (
    f"postgresql+psycopg2://{postgres_user}:{encoded_password}@"
    f"{postgres_host}:{postgres_port}/{postgres_database}"
)

engine = create_engine(DATABASE_URL, pool_size=10, max_overflow=20)
SessionLocal = sessionmaker(bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)