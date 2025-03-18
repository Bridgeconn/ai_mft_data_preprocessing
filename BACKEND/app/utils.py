from fastapi import  Security
from fastapi.security import HTTPBearer

oauth2_scheme = HTTPBearer()

async def input_token(token: str = Security(oauth2_scheme)):
    '''Function to validate API key, currently only for swagger to have a token input'''
    user_token = {"token": token}
    return user_token
