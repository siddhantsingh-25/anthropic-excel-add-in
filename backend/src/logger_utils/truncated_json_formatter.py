import json
import logging

class TruncatedJSONFormatter(logging.Formatter):
    def __init__(self, max_length=100, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_length = max_length

    def format(self, record):
        record.msg = self.truncate_json(record.msg)
        return super().format(record)

    def truncate_json(self, message):
        try:
            obj = json.loads(message)
            truncated_obj = self.truncate_obj(obj)
            return json.dumps(truncated_obj)
        except json.JSONDecodeError:
            return message

    def truncate_obj(self, obj):
        if isinstance(obj, dict):
            return {key: self.truncate_value(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self.truncate_value(value) for value in obj]
        else:
            return obj

    def truncate_value(self, value):
        if isinstance(value, (dict, list)):
            return f"{json.dumps(value)[:self.max_length]}..."
        else:
            return value