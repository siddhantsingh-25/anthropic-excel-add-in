import logging
from .truncated_json_formatter import TruncatedJSONFormatter

# Configure logging with the custom formatter
logger = logging.getLogger(__name__)
handler = logging.StreamHandler()
formatter = TruncatedJSONFormatter()
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)