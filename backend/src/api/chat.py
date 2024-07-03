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
from models.model import Message, OcrRequest, ApiResponse, ChatRequest, RetryRequest, ClaudeMessage



router = fastapi.APIRouter()


    
logging.info(f'The anthropic chat model: {model}')
logging.info(f'The anthropic chat max_tokens: {max_tokens}')


    
    
@router.post("/ocr")
@observe()
async def ocrExtraction(ocr_request: OcrRequest):
    try:
        messages = [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": ocr_request.imageType, "data": ocr_request.imageUrl}}
            ],
        }]
        langfuse_ocr_prompt_var_1 = langfuse.get_prompt("add-in-ocr-var-1", cache_ttl_seconds=5)
        response = await clients["anthropic"].messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0.0,
            system=langfuse_ocr_prompt_var_1.prompt,
            messages=messages
        )
        logging.info(f'OCR: API Response : length messages: {len(messages)}')
        messages.append({
            "role": "assistant",
            "content": [{
                "type": "text",
                "text": json.dumps(response.content[0].text),
            }]
        })
        langfuse_context.update_current_trace(
            name="OCR Trace",
            user_id="user_id",
            session_id="session_id",
        )
        langfuse_context.update_current_observation(
            output=messages,
            metadata=f"Input_tokens: {response.usage.input_tokens} Output_tokens: {response.usage.output_tokens}",
            prompt=langfuse_ocr_prompt_var_1.prompt
        )
        return ApiResponse(messages=messages, text=response.content[0].text)
    except pydantic.ValidationError as e:
        logging.error(f"Validation error occurred during OCR extraction: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logging.error(f"Error occurred during OCR extraction: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR extraction.")

@router.post("/retry")
@observe()
async def ocrRetry(retry_request: RetryRequest):
    try:
        messages = retry_request.messages
        retry_message = retry_request.retryMessage
        messages.append({
            "role": "user",
            "content": [{
                "type": "text",
                "text": f'{CLAUDE_RETRY_PROMPT} {retry_message}',
            }]
        })
        langfuse_ocr_prompt_var_1 = langfuse.get_prompt("add-in-ocr-var-1", cache_ttl_seconds=5)
        response = await clients["anthropic"].messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0.0,
            system=langfuse_ocr_prompt_var_1.prompt,
            messages=messages
        )
        logging.info(f'RETRY: API Response: Updated Messages list length: {len(messages)}')
        messages.append({
            "role": "assistant",
            "content": [{
                "type": "text",
                "text": json.dumps(response.content[0].text),
            }]
        })
        langfuse_context.update_current_trace(
            name="OCR Retry",
            user_id="user_id",
            session_id="session_id",
        )
        langfuse_context.update_current_observation(
            output=messages,
            metadata=f"Input_tokens: {response.usage.input_tokens} Output_tokens: {response.usage.output_tokens}",
            prompt=langfuse_ocr_prompt_var_1.prompt
        )
        return ApiResponse(messages=messages, text=response.content[0].text)
    except pydantic.ValidationError as e:
        logging.error(f"Validation error occurred during OCR retry: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logging.error(f"Error occurred during OCR retry: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR retry.")

@observe()
async def call_gpt_image(ocr_request: OcrRequest, prompt: str):
    try: 
        response = openai.chat.completions.create(
            name = "call_gpt_image_non_tabular",
            model = "gpt-4o", 
            response_format= { "type": "json_object" }, 
            messages=[
                {
                    "role": "user",
                    "content": 
                    [
                        {
                            "type": "text",
                            "text": prompt
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                            "url": f"data:{ocr_request.imageType};base64,{ocr_request.imageUrl}"
                            }
                        }
                    ]
                }
            ]
        )
        response_message = response.choices[0].message.content
        logging.info(f"call_gpt_image: response: {response_message}")
        return response_message
    except Exception as e:
        logging.error(f"Error occurred during OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR .")
    
async def call_claude_image(ocr_request: OcrRequest, prompt: str):
    try:        
        messages = [{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": ocr_request.imageType, "data": ocr_request.imageUrl}}
            ],
        }]
        response = await clients["anthropic"].messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0.0,
            system=prompt,
            messages=messages
        )
        llm_response = response.content[0].text
        logging.info(f'call_llm: API Response: {llm_response}')
        return llm_response
    except Exception as e:
        logging.error(f"Error occurred during OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR .")

def get_cell_text(cell_block, blocks):
    text = ''
    if 'Relationships' in cell_block:
        for relationship in cell_block['Relationships']:
            if relationship['Type'] == 'CHILD':
                for child_id in relationship['Ids']:
                    word_block = next((block for block in blocks if block['Id'] == child_id), None)
                    if word_block is not None and word_block['BlockType'] == 'WORD':
                        text += word_block['Text'] + ' '
    return text.strip()

async def process_tabular_image(file: UploadFile):
    try: 
        file_bytes = await file.read()
        logging.info(f"process_tabular_image: length of file bytes: {len(file_bytes)}")
        response = textract_client.analyze_document(
            Document={'Bytes': file_bytes},
            FeatureTypes=['TABLES']
        )
        await file.close()

        blocks = response['Blocks']
        table_blocks = [block for block in blocks if block['BlockType'] == 'TABLE']

        if len(table_blocks) == 0:
            logging.info('No tables found in the image.')
            return None

        table_data = []

        for table_block in table_blocks:
            row_indexes = {}
            column_indexes = {}

            for relationship in table_block['Relationships']:
                if relationship['Type'] == 'CHILD':
                    for child_id in relationship['Ids']:
                        cell_block = next((block for block in blocks if block['Id'] == child_id), None)
                        if cell_block is not None and cell_block['BlockType'] == 'CELL':
                            row_index = cell_block['RowIndex']
                            column_index = cell_block['ColumnIndex']
                            if row_index not in row_indexes:
                                row_indexes[row_index] = []
                            if column_index not in column_indexes:
                                column_indexes[column_index] = []
                            row_indexes[row_index].append(cell_block)
                            column_indexes[column_index].append(cell_block)

            column_data = {}
            for column_index in range(1, len(column_indexes) + 1):
                cell_block = column_indexes[column_index][0]
                if 'Relationships' in cell_block:
                    text = get_cell_text(cell_block, blocks)
                    column_data[text] = 'string'

            row_data = []
            for row_index in range(2, len(row_indexes) + 1):
                row = {}
                for column_index in range(1, len(column_indexes) + 1):
                    cell_block = row_indexes[row_index][column_index - 1]
                    if 'Relationships' in cell_block:
                        text = get_cell_text(cell_block, blocks)
                        column_name = get_cell_text(column_indexes[column_index][0], blocks)
                        row[column_name] = text
                row_data.append(row)

            table_data.append({
                'ColumnData': column_data,
                'RowData': row_data
            })

        output = {'data': table_data}
        return output
    
    except Exception as e:
        logging.error(f"process_tabular_image: Error occurred during Tabular OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tabular OCR Via API failed.")

    
async def call_ocr_api(file: UploadFile):
    try: 
        result = await process_tabular_image(file)
        if result is not None:
            logging.info(f"OCR API response: \n{json.dumps(result, indent=2)}")
        return result
    
    except Exception as e:
        logging.error(f"call_ocr_api Error occurred during OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Tabular OCR Via Textract failed.")
        
@router.post("/ocr2")
async def extract_ocr(file: UploadFile = File(...)):
    try: 
        file_bytes = await file.read()
        await file.seek(0)
        mime_type = magic.from_buffer(file_bytes, mime=True)
        base64_encoded = base64.b64encode(file_bytes).decode('utf-8')
        file.seek(0)
        ocr_request = OcrRequest(imageUrl=base64_encoded, imageType=mime_type)
        logging.info(f"extract_ocr: mime_type: {mime_type}")
        call_llm_image = asyncio.create_task(call_claude_image(ocr_request, CLAUDE_DETECT_IMAGETYPE_PROMPT))
        call_llm_non_tabular = asyncio.create_task(call_claude_image(ocr_request, CLAUDE_NON_TABULAR_PROMPT))
        call_ocr_tabular = asyncio.create_task(call_ocr_api(file))
        llm_image_response = await call_llm_image
        detected_image_type = json.loads(llm_image_response)
        logging.info(f"OCR2: detected_image_type: {detected_image_type['detectedType']}")
        ocr_result = ""
        if(detected_image_type["detectedType"] == "tabular"): 
            ocr_result = await call_ocr_tabular
        else:
            llm_response = await call_llm_non_tabular
            ocr_result = {'data': json.loads(llm_response)}
        return ocr_result      
    
    except pydantic.ValidationError as e:
        logging.error(f"Validation error occurred during OCR retry: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logging.error(f"extract_ocr: Error occurred during OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR .")


        
@router.post("/ocr3")
async def extract_ocr_and_gpt(file: UploadFile = File(...)):
    try: 
        file_bytes = await file.read()
        await file.seek(0)
        mime_type = magic.from_buffer(file_bytes, mime=True)
        base64_encoded = base64.b64encode(file_bytes).decode('utf-8')
        await file.seek(0)
        ocr_request = OcrRequest(imageUrl=base64_encoded, imageType=mime_type)
        logging.info(f"extract_ocr: mime_type: {mime_type}")
        call_llm_image = asyncio.create_task(call_gpt_image(ocr_request, CLAUDE_DETECT_IMAGETYPE_PROMPT))
        call_llm_non_tabular = asyncio.create_task(call_gpt_image(ocr_request, CLAUDE_NON_TABULAR_PROMPT))
        call_ocr_tabular = asyncio.create_task(call_ocr_api(file))
        llm_image_response = await call_llm_image
        detected_image_type = json.loads(llm_image_response)
        logging.info(f"OCR3: detected_image_type: {detected_image_type['detectedType']}")
        ocr_result = ""
        if(detected_image_type["detectedType"] == "tabular"): 
            ocr_result = await call_ocr_tabular
        else:
            llm_response = await call_llm_non_tabular
            ocr_result = {'data': json.loads(llm_response)}
        return ocr_result      
    
    except pydantic.ValidationError as e:
        logging.error(f"Validation error occurred during OCR retry: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logging.error(f"extract_ocr_and_gpt: Error occurred during OCR : {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during OCR .")


def get_page_count(file: UploadFile):
    reader = PdfReader(file.file)
    return len(reader.pages)


def split_pdf(file: UploadFile):
    file.file.seek(0)
    reader = PdfReader(file.file)
    pages = []
    for i in range(len(reader.pages)):
        writer = PdfWriter()
        writer.add_page(reader.pages[i])
        page_bytes = BytesIO()
        writer.write(page_bytes)
        pages.append(page_bytes.getvalue())
    return pages

def extract_table_data(response):
    table_data = []
    for block in response['Blocks']:
        if block['BlockType'] == 'TABLE':
            print(f"Found table block: {block}")
            rows = []
            for row in block['Relationships']:
                if row['Type'] == 'CHILD':
                    print(f"Found row: {row}")
                    cells = []
                    for cell_id in row['Ids']:
                        cell_text = ''
                        for item in response['Blocks']:
                            if item['Id'] == cell_id:
                                print(f"Found cell block: {item}")
                                if 'Text' in item:
                                    cell_text = item['Text']
                                    print(f"Found cell text: {cell_text}")
                                else:
                                    print("No 'Text' key found in the cell block.")
                                break
                        if cell_text.strip():
                            cells.append(cell_text)
                    if cells:
                        rows.append(cells)
            if rows:
                table_data.append(rows)
    return table_data

@router.post("/extract_table_ocr_pdf")
@observe()
async def extract_table_ocr(file: UploadFile = File(...)):
    try:
        file_extension = file.filename.split('.')[-1].lower()

        if file_extension not in ['pdf']:
            raise HTTPException(status_code=400, detail="Unsupported file format")
        
        # Split the PDF into individual pages
        # pages = split_pdf(file)
        
        tables = []
        
        # Process each page separately
        # for page_bytes in pages:
        #     response = textract_client.analyze_document(
        #         Document={'Bytes': page_bytes},
        #         FeatureTypes=['TABLES']
        #     )
            
        #     page_tables = extract_table_data(response)
        #     tables.extend(page_tables)
        file_bytes = await file.read()
        response = textract_client.analyze_document(
            Document={'Bytes': file_bytes},
            FeatureTypes=['TABLES']
        )
        page_tables = extract_table_data(response)
        tables.extend(page_tables)
        await file.close()

        return {"tables": json.dumps(tables)}

    except pydantic.ValidationError as e:
        logging.error(f"extract_table_ocr: Validation error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await file.close()
        logging.error(f"extract_table_ocr: Error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during chat processing.")


@router.post("/extract_table_ocr_excel")
@observe()
async def extract_table_ocr(file: UploadFile = File(...)):
    try:
        file_extension = file.filename.split(".")[-1].lower()
    
        if file_extension == "csv":
            csv_data = await file.read()
            buffer = io.BytesIO(csv_data)
        
        elif file_extension in ["xlsx", "xls"]:
            df = pd.read_excel(file.file, engine='openpyxl')
            csv_data = df.to_csv(index=False)
            buffer = io.StringIO()
            buffer.write(csv_data)
            buffer.seek(0)
        
        else:
            return Response("Unsupported file format. Please upload a CSV or XLSX file.", status_code=400)
        
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": buffer.getvalue()
                    }
                ]
            }
        ]
        langfuse_t12_prompt_var_1 = langfuse.get_prompt("add-in-t12-v1", cache_ttl_seconds=5)
        response = await clients["anthropic"].messages.create(
            model=model,
            max_tokens=max_tokens,
            temperature=0.0,
            system=langfuse_t12_prompt_var_1.prompt,
            messages=messages
        )
        
        return ApiResponse(messages=[], text=response.content[0].text)

    except pydantic.ValidationError as e:
        logging.error(f"extract_table_ocr_excel: Validation error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        await file.close()
        logging.error(f"extract_table_ocr_excel: Error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during chat processing.")
    
        
@router.post("/chat")
@observe()
async def chat_handler(chat_request: ChatRequest):
    try:
        messages = [{"role": "system", "content": "You are a helpful assistant."}] + chat_request.messages
        # Add your chat processing logic here
        return "working"
    except pydantic.ValidationError as e:
        logging.error(f"Validation error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logging.error(f"Error occurred during chat processing: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="An error occurred during chat processing.")