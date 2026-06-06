from sqlalchemy import Column, String, DateTime, UUID, Boolean
from database import Base
import uuid

class Message(Base):
    __tablename__ = 'Messages'
    
    MessageID = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ConversationID = Column(UUID(as_uuid=True))
    SenderID = Column(String(10))
    Content = Column(String)
    SentAt = Column(DateTime)
    IsRead = Column(Boolean, default=False)