"""
Tests de la función crítica de validación de identificación ecuatoriana.
Es exactamente el tipo de test que la guía del hackathon pone como ejemplo
de "nivel intermedio": función crítica de negocio, sin BD ni LLM.
"""
from app.utils.ecuador_ids import validar_cedula, validar_ruc, validar_documento


class TestValidarCedula:
    def test_cedula_valida_conocida(self):
        assert validar_cedula("1710034065") is True

    def test_cedula_valida_otro_caso(self):
        assert validar_cedula("1713175071") is True

    def test_cedula_con_digito_verificador_incorrecto(self):
        # misma cédula válida pero con el último dígito alterado
        assert validar_cedula("1710034066") is False

    def test_cedula_con_provincia_invalida(self):
        assert validar_cedula("9910034065") is False  # provincia 99 no existe

    def test_cedula_con_tercer_digito_invalido(self):
        assert validar_cedula("1793034065") is False  # tercer dígito 9 no es de persona natural

    def test_cedula_longitud_incorrecta(self):
        assert validar_cedula("12345") is False

    def test_cedula_con_letras(self):
        assert validar_cedula("171003406X") is False

    def test_cedula_vacia_o_none(self):
        assert validar_cedula("") is False
        assert validar_cedula(None) is False


class TestValidarRuc:
    def test_ruc_persona_natural_valido(self):
        resultado = validar_ruc("1710034065001")
        assert resultado.valido is True
        assert resultado.tipo == "ruc_persona_natural"

    def test_ruc_persona_natural_con_cedula_base_invalida(self):
        resultado = validar_ruc("1710034066001")
        assert resultado.valido is False

    def test_ruc_persona_natural_con_establecimiento_000(self):
        resultado = validar_ruc("1710034065000")
        assert resultado.valido is False  # establecimiento 000 no es válido

    def test_ruc_sociedad_privada_valido(self):
        resultado = validar_ruc("1792146739001")
        assert resultado.valido is True
        assert resultado.tipo == "ruc_sociedad_privada"

    def test_ruc_sociedad_privada_digito_verificador_incorrecto(self):
        resultado = validar_ruc("1792146730001")
        assert resultado.valido is False

    def test_ruc_longitud_incorrecta(self):
        resultado = validar_ruc("12345")
        assert resultado.valido is False
        assert resultado.tipo == "invalido"

    def test_ruc_con_caracteres_no_numericos(self):
        resultado = validar_ruc("171003406500X")
        assert resultado.valido is False


class TestValidarDocumento:
    def test_detecta_cedula_por_longitud(self):
        resultado = validar_documento("1710034065")
        assert resultado.tipo == "cedula"
        assert resultado.valido is True

    def test_detecta_ruc_por_longitud(self):
        resultado = validar_documento("1710034065001")
        assert resultado.tipo == "ruc_persona_natural"
        assert resultado.valido is True

    def test_documento_con_espacios_se_limpia(self):
        resultado = validar_documento("  1710034065  ")
        assert resultado.valido is True

    def test_longitud_no_reconocida(self):
        resultado = validar_documento("123")
        assert resultado.valido is False
        assert resultado.tipo == "invalido"