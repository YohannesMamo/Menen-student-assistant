import os

# 1. Pull the raw environment variable from your Pxxl dashboard
raw_db_url = os.getenv("DATABASE_URL")

# 2. Safety check: Force string manipulation to replace the prefix for SQLAlchemy 2.0
if raw_db_url and raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
else:
    DATABASE_URL = raw_db_url

# 3. Pass your cleaned DATABASE_URL into your SQLAlchemy create_engine function
# engine = create_engine(DATABASE_URL)
