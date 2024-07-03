import os
from dotenv import load_dotenv
from queue import Queue
import boto3
import redis
from cryptography.fernet import Fernet

load_dotenv()

model = os.getenv("ANTHROPIC_CHAT_MODEL")
max_tokens = int(os.getenv("MAX_TOKENS"))
screenshot_queue = Queue(maxsize=1)
# Get keys for your project
os.environ["LANGFUSE_PUBLIC_KEY"] = os.getenv("LANGFUSE_PUBLIC_KEY")
os.environ["LANGFUSE_SECRET_KEY"] = os.getenv("LANGFUSE_SECRET_KEY")
os.environ["LANGFUSE_HOST"] = os.getenv("LANGFUSE_HOST")
auth_domain = os.getenv("AUTH_DOMAIN")
auth_client_id = os.getenv("AUTH_CLIENT_ID")
auth_client_secret = os.getenv("AUTH_CLIENT_SECRET")
secret_decryption_key = os.getenv("SECRET_DECRYPTION_KEY")
clients = {}
from langfuse import Langfuse
langfuse = Langfuse()

print(f'Langfuse auth check results: {langfuse.auth_check()}')

with open(os.path.join(os.getcwd(), "claude_ocr_prompt.txt")) as file:
    CLAUDE_OCR_PROMPT = file.read()

with open(os.path.join(os.getcwd(), "claude_retry_prompt.txt")) as file:
    CLAUDE_RETRY_PROMPT = file.read()
    
with open(os.path.join(os.getcwd(), "claude_detect_image_type.txt")) as file:
    CLAUDE_DETECT_IMAGETYPE_PROMPT = file.read()

with open(os.path.join(os.getcwd(), "claude_non_tabular_prompt.txt")) as file:
    CLAUDE_NON_TABULAR_PROMPT = file.read()

textract_client = boto3.client(
    'textract',
    aws_access_key_id=os.getenv("AWS_ACCESS_KEY"),
    aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS"),
    region_name=os.getenv("AWS_REGION")
)

redis_client = redis.Redis(
  host=os.environ["REDIS_HOST"],
  port=os.environ["REDIS_PORT"],
  password=os.environ["REDIS_PASS"],
  ssl=True
)


fernet = Fernet(secret_decryption_key)


