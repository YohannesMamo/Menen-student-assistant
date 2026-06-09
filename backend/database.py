import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# 1. Directly fetch the configuration from the environment
raw_db_url = os.getenv("DATABASE_URL")

# 2. Clean the string to meet SQLAlchemy 2.0 specs
if raw_db_url and raw_db_url.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
else:
    SQLALCHEMY_DATABASE_URL = raw_db_url or "sqlite:///./fallback.db"

# 3. Create your production engine using the clean variable string
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# 4. Instantiate the session mapping
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 5. Define the base model structure
Base = declarative_base()

# 6. ADD THIS FUNCTION (The missing link your routes are looking for)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
