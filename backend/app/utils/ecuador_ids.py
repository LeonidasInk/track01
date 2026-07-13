"""
Validación de identificación tributaria ecuatoriana (cédula y RUC).

Se implementa como módulo aislado y sin dependencias de la base de datos ni
del LLM, siguiendo el mismo principio de "lógica separada de la interfaz"
que ya usa el proyecto en `crm_tools.py`. Esto es justo el tipo de función
crítica que la guía del hackathon pone como ejemplo de "nivel intermedio"
de testing ("validación de RUC/cédula").

Algoritmos según el Registro Civil / SRI de Ecuador:
- Cédula: módulo 10, 10 dígitos.
- RUC persona natural: cédula válida + 3 dígitos de establecimiento (13 dígitos).
- RUC sociedad privada: módulo 11 (tercer dígito = 9), 13 dígitos.
- RUC sociedad pública: módulo 11 (tercer dígito = 6), 13 dígitos.
"""
from dataclasses import dataclass
from typing import Literal

TipoDocumento = Literal["cedula", "ruc_persona_natural", "ruc_sociedad_privada", "ruc_sociedad_publica", "invalido"]


@dataclass
class ResultadoValidacion:
    valido: bool
    tipo: TipoDocumento
    mensaje: str


def _solo_digitos(valor: str) -> bool:
    return valor.isdigit()


def _provincia_valida(codigo: str) -> bool:
    """Los dos primeros dígitos deben ser 01-24 (provincias) o 30 (extranjeros/exterior)."""
    provincia = int(codigo)
    return (1 <= provincia <= 24) or provincia == 30


def validar_cedula(cedula: str) -> bool:
    """Algoritmo módulo 10 para cédula ecuatoriana (10 dígitos)."""
    if not cedula or len(cedula) != 10 or not _solo_digitos(cedula):
        return False
    if not _provincia_valida(cedula[0:2]):
        return False

    tercer_digito = int(cedula[2])
    if tercer_digito >= 6:
        return False  # el tercer dígito de una cédula de persona natural siempre es 0-5

    coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2]
    suma = 0
    for i in range(9):
        valor = int(cedula[i]) * coeficientes[i]
        if valor > 9:
            valor -= 9
        suma += valor

    residuo = suma % 10
    digito_verificador_esperado = 0 if residuo == 0 else 10 - residuo
    return digito_verificador_esperado == int(cedula[9])


def _validar_modulo_11(digitos: list[int], coeficientes: list[int]) -> int:
    """Devuelve el dígito verificador esperado según módulo 11."""
    suma = sum(d * c for d, c in zip(digitos, coeficientes))
    residuo = suma % 11
    return 0 if residuo == 0 else 11 - residuo


def validar_ruc(ruc: str) -> ResultadoValidacion:
    """
    Valida un RUC ecuatoriano (13 dígitos) y determina su tipo.
    No rechaza duro por diseño del hackathon (se permiten datos ficticios),
    pero deja claro si el documento es válido o no para que el agente/CRM
    lo use como señal de confianza, no como bloqueo silencioso.
    """
    if not ruc or len(ruc) != 13 or not _solo_digitos(ruc):
        return ResultadoValidacion(False, "invalido", "El RUC debe tener 13 dígitos numéricos.")

    if not _provincia_valida(ruc[0:2]):
        return ResultadoValidacion(False, "invalido", "Código de provincia inválido en el RUC.")

    tercer_digito = int(ruc[2])
    establecimiento = ruc[10:13]

    if tercer_digito < 6:
        # Persona natural: los primeros 10 dígitos deben ser una cédula válida.
        if validar_cedula(ruc[0:10]) and establecimiento != "000":
            return ResultadoValidacion(True, "ruc_persona_natural", "RUC de persona natural válido.")
        return ResultadoValidacion(False, "invalido", "RUC de persona natural inválido (cédula base o establecimiento incorrecto).")

    if tercer_digito == 9:
        # Sociedad privada: módulo 11 sobre los primeros 9 dígitos.
        digitos = [int(d) for d in ruc[0:9]]
        coeficientes = [4, 3, 2, 7, 6, 5, 4, 3, 2]
        esperado = _validar_modulo_11(digitos, coeficientes)
        if esperado == 10:
            return ResultadoValidacion(False, "invalido", "RUC de sociedad privada con dígito verificador inválido.")
        if esperado == int(ruc[9]) and establecimiento != "000":
            return ResultadoValidacion(True, "ruc_sociedad_privada", "RUC de sociedad privada válido.")
        return ResultadoValidacion(False, "invalido", "RUC de sociedad privada inválido.")

    if tercer_digito == 6:
        # Sociedad pública: módulo 11 sobre los primeros 8 dígitos, establecimiento de 4 dígitos.
        digitos = [int(d) for d in ruc[0:8]]
        coeficientes = [3, 2, 7, 6, 5, 4, 3, 2]
        esperado = _validar_modulo_11(digitos, coeficientes)
        establecimiento_publico = ruc[9:13]
        if esperado == 10:
            return ResultadoValidacion(False, "invalido", "RUC de sociedad pública con dígito verificador inválido.")
        if esperado == int(ruc[8]) and establecimiento_publico != "0000":
            return ResultadoValidacion(True, "ruc_sociedad_publica", "RUC de sociedad pública válido.")
        return ResultadoValidacion(False, "invalido", "RUC de sociedad pública inválido.")

    return ResultadoValidacion(False, "invalido", "Tercer dígito del RUC no reconocido.")


def validar_documento(documento: str) -> ResultadoValidacion:
    """
    Punto de entrada único: recibe cédula (10 dígitos) o RUC (13 dígitos)
    y devuelve si es válido y de qué tipo. Pensado para usarse directo
    desde crm_tools.py al crear/actualizar un Contact.
    """
    documento = (documento or "").strip()

    if len(documento) == 10:
        if validar_cedula(documento):
            return ResultadoValidacion(True, "cedula", "Cédula válida.")
        return ResultadoValidacion(False, "invalido", "Cédula inválida.")

    if len(documento) == 13:
        return validar_ruc(documento)

    return ResultadoValidacion(False, "invalido", "Longitud de documento no reconocida (debe ser 10 o 13 dígitos).")