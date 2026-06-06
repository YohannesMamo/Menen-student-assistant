from sqlalchemy import Column,text, String, DateTime
from database import Base

class user(Base):
    __tablename__ = 'users'
    
     # Tell SQLAlchemy that the database generates this value
    UserID = Column(
        String(10), 
        primary_key=True,
        server_default=text("('USR'::text || lpad(nextval('user_id_seq'::regclass)::text, 7, '0'::text))")
    )
    
    Email = Column(String(50), nullable=False)
    PasswordHash = Column(String(255), nullable=False)
    PasswordSalt = Column(String, nullable=False)
    Role = Column(String, nullable=False)
    LastLogin = Column(DateTime)
    CreatedOn = Column(DateTime)
    UpdatedOn = Column(DateTime)
    UpdatedAt = Column(DateTime)