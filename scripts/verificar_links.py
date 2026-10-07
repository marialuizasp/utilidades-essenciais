"""Checagem conservadora de disponibilidade de links de afiliados."""
import html as html_lib
import os
import re
import ssl
import smtplib
import time
import unicodedata
from datetime import datetime
from email.message import EmailMessage
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

from openpyxl import load_workbook

ARQUIVO = "controle/controle_links_afiliados_utilidades_essenciais.xlsx"
AGORA = datetime.now(ZoneInfo("America/Sao_Paulo")).replace(tzinfo=None)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/154.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
    "Cache-Control": "no-cache",
}

PADROES = {
    "shopee": [
        "produto nao existe",
        "produto indisponivel",
        "este produto foi removido",
        "item nao encontrado",
        "item not found",
        "this item has been removed",
        "this item is no longer available",
    ],
    "amazon": [
        "atualmente indisponivel",
        "indisponivel no momento",
        "nao sabemos quando ou se este item estara de volta em estoque",
        "currently unavailable",
        "we don't know when or if this item will be back in stock",
        "sorry we couldn't find that page",
    ],
    "mercadolivre": [
        "este anuncio esta pausado",
        "anuncio pausado",
        "publicacao pausada",
        "produto indisponivel",
        "nao encontramos o que voce esta procurando",
    ],
    "aliexpress": [
        "this item is no longer available",
        "sorry this item is unavailable",
        "item unavailable",
    ],
}

def _normalizar(texto):
    texto = html_lib.unescape(texto or "")
    texto = unicodedata.normalize("NFKD", texto)
    texto = "".join(ch for ch in texto if not unicodedata.combining(ch))
    texto = texto.lower()
    return re.sub(r"\s+", " ", texto)

def _marketplace(host):
    host = (host or "").lower()
    if "shopee." in host:
        return "shopee"
    if "amazon." in host or "amzn." in host:
        return "amazon"
    if "mercadolivre." in host or "mercadolibre." in host:
        return "mercadolivre"
    if "aliexpress." in host:
        return "aliexpress"
    return ""

def _pagina_generica(destino):
    parsed = urlparse(destino)
    path = (parsed.path or "/").rstrip("/") or "/"
    market = _marketplace(parsed.netloc)
    if market == "shopee" and path == "/":
        return True
    if market == "amazon" and path in ("/", "/gp"):
        return True
    if market == "mercadolivre" and path == "/":
        return True
    if market == "aliexpress" and path == "/":
        return True
    return False

def _tem_sinal_indisponivel(texto, destino):
    normalizado = _normalizar(texto)
    market = _marketplace(urlparse(destino).netloc)
    for padrao in PADROES.get(market, []):
        if padrao in normalizado:
            return padrao
    return ""

def verificar(url):
    """Retorna (disponivel|indisponivel|erro_verificacao, detalhe)."""
    if not isinstance(url, str) or not url.startswith(("https://", "http://")):
        return "erro_verificacao", "URL ausente ou inválida"

    req = Request(url, headers=HEADERS)
    try:
        with urlopen(req, timeout=22) as resposta:
            destino = resposta.geturl()
            status = resposta.status
            raw = resposta.read(900_000)
            charset = resposta.headers.get_content_charset() or "utf-8"
            try:
                texto = raw.decode(charset, errors="replace")
            except LookupError:
                texto = raw.decode("utf-8", errors="replace")

            sinal = _tem_sinal_indisponivel(texto, destino)
            if sinal:
                return "indisponivel", f"Sinal de anúncio indisponível: {sinal}; HTTP {status}; destino: {destino[:220]}"

            if _pagina_generica(destino):
                return "erro_verificacao", f"Redirecionou para página genérica; HTTP {status}; destino: {destino[:220]}"

            if status >= 400:
                return "erro_verificacao", f"HTTP {status}; destino: {destino[:220]}"

            if destino.rstrip("/") != url.rstrip("/"):
                return "disponivel", f"Conteúdo carregado; HTTP {status}; destino: {destino[:220]}"
            return "disponivel", f"Conteúdo carregado; HTTP {status}"

    except HTTPError as erro:
        if erro.code in (404, 410):
            return "indisponivel", f"HTTP {erro.code}: anúncio/página removida"
        if erro.code in (401, 403, 429):
            return "erro_verificacao", f"HTTP {erro.code}: acesso automatizado bloqueado ou limitado"
        if 500 <= erro.code <= 599:
            return "erro_verificacao", f"HTTP {erro.code}: falha temporária do marketplace"
        return "erro_verificacao", f"HTTP {erro.code}"
    except (URLError, TimeoutError, OSError) as erro:
        return "erro_verificacao", f"Falha temporária: {str(erro)[:140]}"

def main():
    wb = load_workbook(ARQUIVO)
    aba = wb["Afiliados"]
    historico = wb["Historico"]
    resumo, mudancas = [], []

    for linha in range(2, aba.max_row + 1):
        produto = aba.cell(linha, 2).value
        if not produto:
            continue
        identificador = aba.cell(linha, 1).value or f"linha_{linha}"
        link = aba.cell(linha, 5).value
        anterior = aba.cell(linha, 11).value or "erro_verificacao"
        novo, detalhe = verificar(link)

        aba.cell(linha, 11).value = novo
        aba.cell(linha, 13).value = AGORA
        aba.cell(linha, 15).value = detalhe
        aba.cell(linha, 10).value = "Não verificado"

        if anterior != novo:
            historico.append([AGORA, identificador, produto, "Link", anterior, novo, "Checagem de disponibilidade", link, detalhe])
            mudancas.append(f"- {produto}: {anterior} → {novo}")

        resumo.append(f"- {produto}: {novo}. {detalhe}")
        time.sleep(1)

    wb.save(ARQUIVO)
    texto = (
        f"Relatório diário — Utilidades Essenciais — {AGORA:%d/%m/%Y %H:%M}\n\n"
        f"Links consultados: {len(resumo)}\n\n"
        + "\n".join(resumo) + "\n\n"
        + "Mudanças:\n" + ("\n".join(mudancas) or "Nenhuma mudança detectada.")
        + "\n\nA checagem usa HTTP + sinais de conteúdo da página. Bloqueios do marketplace são classificados como erro_verificacao."
    )
    print(texto)

    required = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "REPORT_TO"]
    if any(not os.getenv(k) for k in required):
        print("E-mail não enviado: falta configurar secrets SMTP e REPORT_TO.")
        return

    msg = EmailMessage()
    msg["Subject"] = f"Relatório de afiliados — {AGORA:%d/%m/%Y}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = os.environ["REPORT_TO"]
    msg.set_content(texto)

    port = int(os.getenv("SMTP_PORT", "465"))
    with smtplib.SMTP_SSL(
        os.environ["SMTP_HOST"],
        port,
        context=ssl.create_default_context(),
        timeout=30,
    ) as smtp:
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(msg)
    print("Relatório enviado.")

if __name__ == "__main__":
    main()
