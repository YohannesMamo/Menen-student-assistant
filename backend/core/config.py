import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = ""
    
    # ◄ Add these four lines exactly so Pydantic allows them
    secret_key: str = ""
    google_api_key: str = ""
    environment: str = "production"
    debug: bool = False

    class Config:
        env_file = ".env"
        # Optional alternative bypass: 
        # extra = "ignore"  # Uncomment this line if you want to silently ignore any future extra variables

# Pull the raw environment variable from your Pxxl dashboard
raw_db_url = os.getenv("DATABASE_URL")

if raw_db_url and raw_db_url.startswith("postgres://"):
    DATABASE_URL = raw_db_url.replace("postgres://", "postgresql+psycopg2://", 1)
else:
    DATABASE_URL = raw_db_url

# Instantiate the global settings object
settings = Settings()
if DATABASE_URL:
    settings.DATABASE_URL = DATABASE_URL
