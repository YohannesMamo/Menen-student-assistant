from sqlalchemy import Column, String, DateTime, Integer, Boolean, UUID
from database import Base
import uuid

class STBPresentation(Base):
    __tablename__ = 'STBPresentations'
    
    SlideId = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    PresentationId = Column(UUID(as_uuid=True), nullable=False)
    StbId = Column(String(10), nullable=False)
    StbChapterId = Column(Integer, nullable=False)
    StbSectionId = Column(String(50), nullable=False)
    SlideNumber = Column(Integer, nullable=False)
    SlideTitle = Column(String(255))
    STBBasicPresentation = Column(String)
    STBAdvancedPresentation = Column(String)
    STBAIPresentations = Column(String)
    Notes = Column(String)
    DurationSeconds = Column(Integer)
    HasQuiz = Column(Boolean, default=False)
    CreatedAt = Column(DateTime, nullable=False)
    UpdatedAt = Column(DateTime, nullable=False)