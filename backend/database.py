import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Directly fetch the configuration from the environment
raw_db_url = os.getenv("DATABASE_URL")

# 2. Clean the string to meet SQLAlchemy 2.0 specs
if raw_db_url and raw_db_url.startswith("postgres://"):
    SQLALCHEMY_DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
else:
    # Safe fallback inside the script if no live dashboard variables are parsed
    SQLALCHEMY_DATABASE_URL = raw_db_url or "sqlite:///./fallback.db" 

# 3. Create your production engine using the clean variable string
engine = create_engine(SQLALCHEMY_DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
