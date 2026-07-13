"""
Limitador de tasa compartido (protege la cuota de la API de Gemini).

Se centraliza aquí para poder importarlo desde main.py (registro del
middleware/handler) y desde cada router (decorador @limiter.limit(...))
sin crear instancias distintas.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)