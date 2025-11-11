import os
import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.supabase: Optional[Client] = None
        self._init_supabase()

    def _init_supabase(self):
        try:
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

            if supabase_url and supabase_service_key:
                self.supabase = create_client(supabase_url, supabase_service_key)
            else:
                logger.warning("Supabase credentials not found, log handler disabled")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")

    def emit(self, record: logging.LogRecord):
        if not self.supabase:
            return

        try:
            log_level = record.levelname

            if log_level not in ['INFO', 'WARNING', 'ERROR', 'CRITICAL']:
                if log_level == 'DEBUG':
                    return
                log_level = 'INFO'

            details = {
                'pathname': record.pathname,
                'lineno': record.lineno,
                'funcName': record.funcName,
            }

            if hasattr(record, 'extra_details'):
                details.update(record.extra_details)

            log_entry = {
                'log_level': log_level,
                'source': record.name,
                'message': record.getMessage(),
                'details': details,
                'created_at': datetime.utcnow().isoformat()
            }

            self.supabase.table('system_logs').insert(log_entry).execute()

        except Exception as e:
            logger.error(f"Failed to write log to Supabase: {e}")

def setup_supabase_logging(app_logger: Optional[logging.Logger] = None):
    if app_logger is None:
        app_logger = logging.getLogger()

    handler = SupabaseLogHandler()
    handler.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    handler.setFormatter(formatter)

    app_logger.addHandler(handler)

    return app_logger

def log_system_event(
    level: str,
    source: str,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    user_id: Optional[str] = None
):
    try:
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_service_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

        if not supabase_url or not supabase_service_key:
            return

        supabase = create_client(supabase_url, supabase_service_key)

        log_entry = {
            'log_level': level,
            'source': source,
            'message': message,
            'details': details or {},
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat()
        }

        supabase.table('system_logs').insert(log_entry).execute()

    except Exception as e:
        logger.error(f"Failed to log system event: {e}")
