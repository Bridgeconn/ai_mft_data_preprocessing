from fastapi import  HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from functools import wraps
import requests

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

GITEA_API_URL = "http://localhost:3000/api/v1"

def validate_token(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        
        if request is None:
            for key, value in kwargs.items():
                if isinstance(value, Request):
                    request = value
                    break
        
        if request is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Request object not found",
            )
            
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid authorization header"
            )
        token =  auth_header.replace("Bearer ", "")
        
        try:
            headers = {"Authorization": f"{token}"}
            response = requests.get(f"{GITEA_API_URL}/user", headers=headers)

            
            if response.status_code == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token expired or invalid"
                )
            elif response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed"
                )
            
            if "user_info" in kwargs:
                user_info = response.json()
                kwargs["user_info"] = user_info
            return await func(*args, **kwargs)
            
        except Exception as e:
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    
    return wrapper