from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import user
from models.StudentInfo import StudentInfo
import secrets
import hashlib
from typing import Optional
from fastapi.responses import JSONResponse

router = APIRouter()

SECRET_KEY = "YourSuperSecretKeyForStudentAssistantApp2026MakeItLongAndStrong!"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# ============================================
# REQUEST MODELS (define once)
# ============================================
class RegisterRequest(BaseModel):
    Email: str
    Password: str
    FirstName: Optional[str] = None
    MiddleName: Optional[str] = None
    LastName: Optional[str] = None
    DateOfBirth: Optional[datetime] = None
    GradeId: Optional[str] = None
    PhoneMobile: Optional[str] = None

class LoginRequest(BaseModel):
    Email: str
    Password: str

class UpdateProfileRequest(BaseModel):
    StudentId: Optional[str] = None
    FirstName: Optional[str] = None
    MiddleName: Optional[str] = None
    LastName: Optional[str] = None
    DateOfBirth: Optional[datetime] = None
    PhoneMobile: Optional[str] = None
    PhoneResidence: Optional[str] = None
    WebAddress: Optional[str] = None
    Address: Optional[str] = None
    Grade: Optional[str] = None
    Gender: Optional[str] = None

# ============================================
# HELPER FUNCTIONS (define once)
# ============================================
def utc_now():
    """Return UTC datetime"""
    return datetime.utcnow()

def create_password_hash(password: str):
    """Create PBKDF2 password hash with separate salt"""
    salt = secrets.token_hex(16)
    hash_value = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hash_value, salt

def verify_password(plain_password: str, stored_hash: str, stored_salt: str) -> bool:
    """Verify password against PBKDF2 hash and salt"""
    if not stored_salt:
        return False
    new_hash = hashlib.pbkdf2_hmac(
        'sha256',
        plain_password.encode('utf-8'),
        stored_salt.encode('utf-8'),
        100000
    ).hex()
    return new_hash == stored_hash

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_data = db.query(user).filter(user.UserID == user_id).first()
    if user_data is None:
        raise credentials_exception
    return user_data

# ============================================
# ENDPOINTS
# ============================================
@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    try:
        print(f"Registration attempt for email: {request.Email}")
        
        if not request.Email or not request.Password:
            return JSONResponse(
                status_code=400,
                content={"error": "Email and password are required"}
            )
        
        existing_user = db.query(user).filter(user.Email == request.Email).first()
        if existing_user:
            return JSONResponse(
                status_code=400,
                content={"error": "A user with this email already exists"}
            )
        
        password_hash, password_salt = create_password_hash(request.Password)
        
        new_user = user(
            Email=request.Email,
            PasswordHash=password_hash,
            PasswordSalt=password_salt,
            Role="Student",
            CreatedOn=utc_now()
        )
        
        db.add(new_user)
        db.flush()
        print(f"Created user with ID: {new_user.UserID}")
        
        date_of_birth = request.DateOfBirth or utc_now()
        
        student_info = StudentInfo(
            UserID=new_user.UserID,
            StuFirstName=request.FirstName or "",
            StuMiddleName=request.MiddleName,
            StuLastName=request.LastName or "",
            StuDateOfBirth=date_of_birth,
            StuGrade=request.GradeId or "HIG11A",
            StuPhoneMobile=request.PhoneMobile,
            CreatedAt=utc_now(),
            StuStatus="Active",
			SubscriptionStatus="Free"
			
        )
        
        db.add(student_info)
        db.flush()
        print(f"Created student with ID: {student_info.StudentID}")
        
        db.commit()
        
        access_token = create_access_token(data={"sub": new_user.UserID})
        
        return {
            "message": "Registration successful",
            "token": access_token,
            "userId": new_user.UserID,
            "email": new_user.Email,
            "role": new_user.Role,
            "studentId": student_info.StudentID,
            "firstName": student_info.StuFirstName,
            "isProfileComplete": student_info.IsProfileComplete,
			 "subscriptionStatus": student_info.SubscriptionStatus
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error during registration: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

@router.post("/login")
async def login(request: LoginRequest, db: Session = Depends(get_db)):
    try:
        print(f"Login attempt for email: {request.Email}")
        
        existing_user = db.query(user).filter(user.Email == request.Email).first()
        
        if not existing_user:
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid email or password"}
            )
        
        # Now calling the CORRECT verify_password with 3 arguments
        if not verify_password(request.Password, existing_user.PasswordHash, existing_user.PasswordSalt):
            return JSONResponse(
                status_code=401,
                content={"error": "Invalid email or password"}
            )
        
        existing_user.LastLogin = utc_now()
        db.commit()
        
        access_token = create_access_token(data={"sub": existing_user.UserID})
        
        student_info = db.query(StudentInfo).filter(StudentInfo.UserID == existing_user.UserID).first()
        
        return {
            "message": "Login successful",
            "token": access_token,
            "userId": existing_user.UserID,
            "email": existing_user.Email,
            "role": existing_user.Role,
            "studentId": student_info.StudentID if student_info else None,
            "firstName": student_info.StuFirstName if student_info else None,
            "isProfileComplete": student_info.IsProfileComplete if student_info else False,
        "subscriptionStatus": student_info.SubscriptionStatus if student_info else "Free"  
		}
        
    except Exception as e:
        print(f"Error during login: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error"}
        )

@router.get("/profile")
async def get_profile(current_user: user = Depends(get_current_user), db: Session = Depends(get_db)):
    student_info = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    
    student_data = None
    if student_info:
        student_data = {
            "StudentID": student_info.StudentID,
            "StuFirstName": student_info.StuFirstName,
            "StuMiddleName": student_info.StuMiddleName,
            "StuLastName": student_info.StuLastName,
            "StuDateOfBirth": student_info.StuDateOfBirth,
            "StuPhoneMobile": student_info.StuPhoneMobile,
            "StuPhoneResidence": student_info.StuPhoneResidence,
            "StuWebAddress": student_info.StuWebAddress,
            "StuAddress": student_info.StuAddress,
            "StuGrade": student_info.StuGrade,
            "StuGender": student_info.StuGender,
            "StuStatus": student_info.StuStatus,
			"SubscriptionStatus": student_info.SubscriptionStatus
        }
    
    return {
        "email": current_user.Email,
        "role": current_user.Role,
        "student": student_data
    }

@router.put("/profile")
async def update_profile(request: UpdateProfileRequest, current_user: user = Depends(get_current_user), db: Session = Depends(get_db)):
    student_info = db.query(StudentInfo).filter(StudentInfo.UserID == current_user.UserID).first()
    
    if not student_info:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    if request.FirstName:
        student_info.StuFirstName = request.FirstName
    if request.MiddleName:
        student_info.StuMiddleName = request.MiddleName
    if request.LastName:
        student_info.StuLastName = request.LastName
    if request.DateOfBirth:
        student_info.StuDateOfBirth = request.DateOfBirth
    if request.PhoneMobile:
        student_info.StuPhoneMobile = request.PhoneMobile
    if request.PhoneResidence:
        student_info.StuPhoneResidence = request.PhoneResidence
    if request.WebAddress:
        student_info.StuWebAddress = request.WebAddress
    if request.Address:
        student_info.StuAddress = request.Address
    if request.Grade:
        student_info.StuGrade = request.Grade
    if request.Gender:
        student_info.StuGender = request.Gender
    
    student_info.UpdatedAt = datetime.utcnow()
    
    db.commit()
    db.refresh(student_info)
    
    return {
        "message": "Profile updated successfully",
        "student": {
            "StudentID": student_info.StudentID,
            "StuFirstName": student_info.StuFirstName,
            "StuMiddleName": student_info.StuMiddleName,
            "StuLastName": student_info.StuLastName,
            "StuDateOfBirth": student_info.StuDateOfBirth,
            "StuPhoneMobile": student_info.StuPhoneMobile,
            "StuPhoneResidence": student_info.StuPhoneResidence,
            "StuWebAddress": student_info.StuWebAddress,
            "StuAddress": student_info.StuAddress,
            "StuGrade": student_info.StuGrade,
            "StuGender": student_info.StuGender,
			"SubscriptionStatus": student_info.SubscriptionStatus
        }
    }