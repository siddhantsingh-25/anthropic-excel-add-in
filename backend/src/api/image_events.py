import json
import os
from typing import Literal, List, Dict
import logging
from logger_utils import logger
from fastapi.responses import Response

import fastapi
import pydantic
import requests
from langfuse.decorators import observe, langfuse_context
from fastapi import HTTPException, status, responses, File, UploadFile
from .globals import *
import asyncio
import magic
import base64
# from litellm import completion
from langfuse.openai import openai
from PyPDF2 import PdfReader, PdfWriter
import io
from io import BytesIO
import pandas as pd
from models.model import OcrRequest, UserData
from auth0.authentication import GetToken
from auth0.management import Auth0
from sse_starlette.sse import EventSourceResponse

from base64 import b64decode
import base64

router = fastapi.APIRouter()

def parse_product_key(product_key: str):
    decrypted_user_id = fernet.decrypt(product_key.encode()).decode()
    return decrypted_user_id

def get_auth_token(): 
    get_token = GetToken(auth_domain, auth_client_id, client_secret=auth_client_secret)
    token = get_token.client_credentials('https://{}/api/v2/'.format(auth_domain))
    mgmt_api_token = token['access_token']
    token_ttl = token['expires_in']
    logging.info(f"get_auth_token: {token_ttl},  {mgmt_api_token}")
    redis_client.set("auth0_token", mgmt_api_token, ex=token_ttl)
    return mgmt_api_token
    
def check_user_id_valid(user_id: str):
    try: 
        token_bytes = redis_client.get("auth0_token")
        if token_bytes is not None:
            token = token_bytes.decode('utf-8')
        else:    
            token = get_auth_token()
        auth0 = Auth0(auth_domain, token)
        user = auth0.users.get(id=user_id)
        logging.info(f"check_user_id_valid: get the user details: {user}")
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="user id not in DB")
        return 
    except Exception as e:
        logging.error(f"check_user_id_valid: Error occurred : {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"{e}") 

async def event_generator(user_id: str):
    pubsub = redis_client.pubsub()
    pubsub.subscribe(f"channel:{user_id}")

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            image_base64 = redis_client.get(f"image:{user_id}")
            # image_base64 = message['data'].decode('utf-8')
            yield {'data': image_base64.decode('utf-8')}
        else:
            yield {'data': 'no_image'}
        await asyncio.sleep(1)

@router.get("/get_picture_event/{user_id}")
async def get_picture_event(user_id: str):
    check_user_active_session(user_id)
    logging.info(f"get_picture_event: user_id: {user_id}")
    return EventSourceResponse(event_generator(user_id))

@router.post("/logout")
async def logout_user_id(user_data: UserData): 
    redis_client.srem("login_ids_set", user_data.user_id)
    redis_client.set(f"image:{user_data.user_id}", "")
    logging.info(f"logout: {user_data.user_id}")
    return responses.JSONResponse({"message": "user id session removed from DB"})
    
def check_user_active_session(user_id: str):
    logging.info(f"check_user_active_session: {user_id}")
    if not redis_client.sismember("login_ids_set", user_id):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail = "user session inactive")
    
@router.post("/get_encrypted_user_details")
async def encrypt_user_id(user_data: UserData):
    encrypted_user_id = fernet.encrypt(user_data.user_id.encode())
    redis_client.sadd("login_ids_set", user_data.user_id)
    logging.info(f"get_encrypted_user_details: product_key: {encrypted_user_id.decode()}")
    return responses.JSONResponse({ "product_key": encrypted_user_id.decode() })

@router.get("/get_picture/{user_id}")
async def get_picture(user_id: str):
    try: 
        logging.info(f"get_picture: user_id: {user_id}")
        check_user_active_session(user_id)
        image_base64 = redis_client.get(f"image:{user_id}")
        if image_base64:
            redis_client.set(f"image:{user_id}", "")
            return responses.JSONResponse({"imageBase64": image_base64.decode('utf-8')})
        else:
            return responses.JSONResponse({"message": "Image not found"})
    except HTTPException as e:
        logging.error(f"check_user_id_valid: issue: {e}")
        raise e    
    except Exception as e: 
        logging.error(f"get_picture: Error occurred during image fetch: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during image fetch")
        
@router.post("/new_picture")
@observe()
async def handle_new_picture(ocr_request: OcrRequest):
    try: 
        logging.info(f"handle_new_picture: new picture: {ocr_request.productKey}")
        # parse the user id from the product key
        if ocr_request.productKey is None: 
            raise HTTPException(status_code=400, detail = "product key is none")
     
        user_id = parse_product_key(ocr_request.productKey)
        logging.info(f"handle_new_picture: user_id decrypted: {user_id}")
        # test user id present in the auth0 database. 
        check_user_id_valid(user_id)            
        check_user_active_session(user_id)
        
        image_base64 = ocr_request.imageUrl
        
        # Store the image data in Redis
        redis_client.set(f"image:{user_id}", image_base64)
        
        redis_client.publish(f"channel:{user_id}", "image updated")
        
        return responses.JSONResponse({'message': 'image uploaded successfully'})
        
        
    except pydantic.ValidationError as e:
        logging.error(f"handle_new_picture: Validation error occurred during image data storage: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except HTTPException as e:
        logging.error(f"check_user_id_valid: issue: {e}")
        raise e
    except Exception as e:
        logging.error(f"handle_new_picture: Error occurred during image data storage: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during image data storage")


