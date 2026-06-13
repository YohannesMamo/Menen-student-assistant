from database import SessionLocal
from models.Conversation import Conversation
from models.ConversationParticipant import ConversationParticipant
import sys

def test_query():
    db = SessionLocal()
    try:
        user_id = "STU0000032"
        print(f"Testing query for user: {user_id}")
        participations = db.query(ConversationParticipant).filter(
            ConversationParticipant.UserID == user_id
        ).all()
        print(f"Found {len(participations)} participations")
        for p in participations:
            conv = db.query(Conversation).filter(
                Conversation.ConversationID == p.CPConversationID
            ).first()
            if conv:
                print(f"Found conversation: {conv.ConversationID}")
            else:
                print(f"Conversation not found for participant: {p.CPConversationID}")
    except Exception as e:
        print(f"Error occurred: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    test_query()
