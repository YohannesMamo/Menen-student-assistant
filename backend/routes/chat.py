from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
import os
import aiofiles
from database import get_db
from models.Message import Message
from models.MessageRead import MessageRead
from models.Conversation import Conversation
from models.ConversationParticipant import ConversationParticipant
from models.StudentInfo import StudentInfo

router = APIRouter()

UPLOAD_DIR = "uploads/chat_files"

class ConversationCreate(BaseModel):
    Name: Optional[str] = None
    IsGroup: bool = False
    ParticipantIDs: List[str]

class MessageCreate(BaseModel):
    ConversationID: str
    Content: str
    FileURL: Optional[str] = None

class MessageResponse(BaseModel):
    MessageID: str
    ConversationID: str
    SenderID: str
    Content: str
    SentAt: datetime
    IsRead: bool
    FileURL: Optional[str] = None

os.makedirs(UPLOAD_DIR, exist_ok=True)

# Online users tracking
online_users = set()  # Store user IDs
user_sessions = {}  # Map user ID to socket IDs

@router.post("/api/chat/conversations")
def create_conversation(data: ConversationCreate, db: Session = Depends(get_db)):
    # Create conversation without manually setting UUID (let model handle it)
    conversation = Conversation(
        CName=data.Name,
        IsGroup=data.IsGroup,
        CreatedAt=datetime.now(),
        CreatedBy=data.ParticipantIDs[0] if data.ParticipantIDs else None
    )
    db.add(conversation)
    db.flush()  # Flush to get the generated UUID
    
    # Add participants
    for user_id in data.ParticipantIDs:
        participant = ConversationParticipant(
            CPConversationID=conversation.ConversationID,
            CPUserID=user_id,
            JoinedAt=datetime.now()
        )
        db.add(participant)
    
    db.commit()
    db.refresh(conversation)
    
    return {
        "ConversationID": str(conversation.ConversationID),
        "Name": data.Name,
        "IsGroup": data.IsGroup,
        "ParticipantIDs": data.ParticipantIDs
    }

@router.get("/api/chat/conversations/{user_id}")
def get_user_conversations(user_id: str, db: Session = Depends(get_db)):
    participations = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPUserID == user_id
    ).all()
    
    conversations = []
    for p in participations:
        conv = db.query(Conversation).filter(
            Conversation.ConversationID == p.CPConversationID
        ).first()
        
        if conv:
            participants = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv.ConversationID
            ).all()
            
            last_msg = None
            if conv.LastMessageID:
                last_msg = db.query(Message).filter(
                    Message.MessageID == conv.LastMessageID
                ).first()
            
            conversations.append({
                "ConversationID": str(conv.ConversationID),
                "Name": conv.CName,
                "IsGroup": conv.IsGroup,
                "Participants": [pt.CPUserID for pt in participants],
                "LastMessage": {
                    "Content": last_msg.Content if last_msg else None,
                    "SentAt": last_msg.SentAt if last_msg else None,
                    "SenderID": last_msg.SenderID if last_msg else None
                } if last_msg else None
            })
    
    return conversations

@router.get("/api/chat/messages/{conversation_id}")
def get_messages(conversation_id: str, user_id: str, limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):
    # Convert string back to UUID
    conv_uuid = uuid.UUID(conversation_id)
    
    messages = db.query(Message).filter(
        Message.ConversationID == conv_uuid
    ).order_by(Message.SentAt.desc()).limit(limit).offset(offset).all()
    
    message_reads = db.query(MessageRead).filter(
        MessageRead.MRUserID == user_id,
        MessageRead.MRMessageID.in_([msg.MessageID for msg in messages])
    ).all()
    
    read_message_ids = {str(mr.MRMessageID) for mr in message_reads}
    
    return [
        {
            "MessageID": str(msg.MessageID),
            "ConversationID": str(msg.ConversationID),
            "SenderID": msg.SenderID,
            "Content": msg.Content,
            "SentAt": msg.SentAt.isoformat() if msg.SentAt else None,
            "IsRead": str(msg.MessageID) in read_message_ids,
            "FileURL": msg.Content if msg.Content.startswith('/files/') else None
        }
        for msg in reversed(messages)
    ]

@router.post("/api/chat/upload")
async def upload_file(file: UploadFile = File(...)):
    file_id = str(uuid.uuid4())
    file_ext = os.path.splitext(file.filename)[1] if file.filename else ""
    file_name = f"{file_id}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, file_name)
    
    async with aiofiles.open(file_path, 'wb') as f:
        content = await file.read()
        await f.write(content)
    
    return {"FileURL": f"/files/chat_files/{file_name}", "FileName": file.filename}

@router.get("/api/chat/conversations/{conversation_id}/participants")
def get_participants(conversation_id: str, db: Session = Depends(get_db)):
    conv_uuid = uuid.UUID(conversation_id)
    participants = db.query(ConversationParticipant).filter(
        ConversationParticipant.CPConversationID == conv_uuid
    ).all()
    
    return [{"UserID": p.CPUserID, "JoinedAt": p.JoinedAt.isoformat() if p.JoinedAt else None} for p in participants]

@router.post("/api/chat/conversations/{conversation_id}/read")
def mark_as_read(conversation_id: str, user_id: str, db: Session = Depends(get_db)):
    conv_uuid = uuid.UUID(conversation_id)
    unread_messages = db.query(Message).filter(
        Message.ConversationID == conv_uuid,
        Message.SenderID != user_id
    ).all()
    
    read_count = 0
    for msg in unread_messages:
        existing = db.query(MessageRead).filter(
            MessageRead.MRMessageID == msg.MessageID,
            MessageRead.MRUserID == user_id
        ).first()
        
        if not existing:
            message_read = MessageRead(
                MRMessageID=msg.MessageID,
                MRUserID=user_id,
                ReadAt=datetime.now()
            )
            db.add(message_read)
            read_count += 1
    
    db.commit()
    
    return {"MarkedAsRead": read_count}

@router.get("/api/chat/students")
def get_all_students(db: Session = Depends(get_db)):
    students = db.query(StudentInfo).all()
    return [{
        "StudentID": s.StudentID,
        "FirstName": s.StuFirstName,
        "LastName": s.StuLastName,
        "DisplayName": f"{s.StuFirstName} {s.StuLastName}"
    } for s in students]

def init_socketio(sio):
    
    @sio.event
    async def connect(sid, environ, *args):
        print(f"[SocketIO] Client connected: {sid}")
    
    @sio.event
    async def disconnect(sid, *args):
        print(f"[SocketIO] Client disconnected: {sid}")
        # Remove user from online list
        for user_id, sids in list(user_sessions.items()):
            if sid in sids:
                sids.remove(sid)
                if not sids:
                    online_users.remove(user_id)
                    del user_sessions[user_id]
                    # Notify all clients that user went offline
                    await sio.emit('user_offline', {'user_id': user_id})
                break
    
    @sio.event
    async def join_conversation(sid, data):
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        print(f"[SocketIO] {user_id} joining conversation {conversation_id}")
        await sio.enter_room(sid, f"conv_{conversation_id}")
        await sio.emit('user_joined', {'user_id': user_id, 'conversation_id': conversation_id}, room=f"conv_{conversation_id}")
    
    @sio.event
    async def leave_conversation(sid, data):
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        print(f"[SocketIO] {user_id} leaving conversation {conversation_id}")
        await sio.leave_room(sid, f"conv_{conversation_id}")
        await sio.emit('user_left', {'user_id': user_id, 'conversation_id': conversation_id}, room=f"conv_{conversation_id}")
    
    @sio.event
    async def send_message(sid, data):
        from database import SessionLocal
        
        conversation_id = data.get('conversation_id')
        sender_id = data.get('sender_id')
        content = data.get('content')
        file_url = data.get('file_url')
        
        print(f"[SocketIO] Message from {sender_id} to {conversation_id}: {content[:50] if content else 'file'}")
        
        conv_uuid = uuid.UUID(conversation_id)
        
        db = SessionLocal()
        try:
            # Let model handle UUID generation
            message = Message(
                ConversationID=conv_uuid,
                SenderID=sender_id,
                Content=file_url if file_url else content,
                SentAt=datetime.now(),
                IsRead=False
            )
            db.add(message)
            db.flush()  # To get the generated UUID
            
            conv = db.query(Conversation).filter(Conversation.ConversationID == conv_uuid).first()
            if conv:
                conv.LastMessageID = message.MessageID
            
            db.commit()
            
            message_data = {
                "MessageID": str(message.MessageID),
                "ConversationID": conversation_id,
                "SenderID": sender_id,
                "Content": content,
                "SentAt": datetime.now().isoformat(),
                "IsRead": False,
                "FileURL": file_url
            }
            
            await sio.emit('new_message', message_data, room=f"conv_{conversation_id}")
            
            participants = db.query(ConversationParticipant).filter(
                ConversationParticipant.CPConversationID == conv_uuid
            ).all()
            
            for participant in participants:
                if participant.CPUserID != sender_id:
                    await sio.emit('message_notification', {
                        "ConversationID": conversation_id,
                        "MessageID": str(message.MessageID),
                        "SenderID": sender_id,
                        "Preview": content[:50] if content else "File"
                    }, room=f"user_{participant.CPUserID}")
            
        finally:
            db.close()
    
    @sio.event
    async def typing(sid, data):
        conversation_id = data.get('conversation_id')
        user_id = data.get('user_id')
        is_typing = data.get('is_typing')
        await sio.emit('user_typing', {
            'user_id': user_id,
            'conversation_id': conversation_id,
            'is_typing': is_typing
        }, room=f"conv_{conversation_id}", skip_sid=sid)
    
    @sio.event
    async def register_user(sid, data):
        user_id = data.get('user_id')
        print(f"[SocketIO] Registering user {user_id} with sid {sid}")
        await sio.enter_room(sid, f"user_{user_id}")
        
        # Add to online users
        if user_id not in user_sessions:
            user_sessions[user_id] = set()
        user_sessions[user_id].add(sid)
        online_users.add(user_id)
        
        await sio.emit('registered', {'user_id': user_id, 'sid': sid})
        # Send current online users list
        await sio.emit('online_users', list(online_users))
        # Notify all clients that user came online
        await sio.emit('user_online', {'user_id': user_id})
