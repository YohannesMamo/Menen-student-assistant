import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Your other pydantic settings variables go here (e.g. PROJECT_NAME, SECRET_KEY, etc.)
    DATABASE_URL: str = ""

    class Config:
        env_file = ".env"

# 1. Pull the raw environment variable from your Pxxl dashboard
raw_db_url = os.getenv("DATABASE_URL")

# 2. Safety check: Force string manipulation to replace the prefix for SQLAlchemy 2.0
if raw_db_url and raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
else:
    DATABASE_URL = raw_db_url

# 3. Create the global settings object and override its DATABASE_URL property (CRUCIAL LINE)
settings = Settings()
if DATABASE_URL:
    settings.DATABASE_URL = DATABASE_URL
