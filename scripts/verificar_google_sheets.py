"""Daily link report from the public Products CSV published by Google Sheets."""
import csv, io, os, ssl, smtplib, time
from datetime import datetime
from email.message import EmailMessage
from urllib.request import urlopen
from zoneinfo import ZoneInfo
from verificar_links import verificar

def main():
    url = os.environ["GOOGLE_SHEET_CSV_URL"]
    with urlopen(url, timeout=30) as response:
        content = response.read().decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(content)))
    required = {"id", "title", "affiliateLink", "active"}
    if not rows and not required.issubset(set(content.splitlines()[0].split(","))):
        raise ValueError("Planilha sem cabeçalhos esperados")
    if rows and not required.issubset(rows[0]):
        raise ValueError("Cabeçalhos ausentes: " + str(required - set(rows[0])))
    products = [r for r in rows if r.get("active", "").strip().lower() in ("sim", "true", "1", "yes") and r.get("title", "").strip()]
    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    summary = []
    for product in products:
        status, detail = verificar(product.get("affiliateLink", "").strip())
        summary.append(f"- {product['title']}: {status}. {detail}")
        time.sleep(1)
    report = f"Relatório diário — Utilidades Essenciais — {now:%d/%m/%Y %H:%M}\nProdutos ativos: {len(products)}\n\n" + ("\n".join(summary) or "Nenhum produto ativo.") + "\n\nChecagem HTTP não garante estoque, preço ou comissão."
    print(report)
    msg = EmailMessage()
    msg["Subject"] = f"Relatório de afiliados — {now:%d/%m/%Y}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = os.environ["REPORT_TO"]
    msg.set_content(report)
    with smtplib.SMTP_SSL(os.environ["SMTP_HOST"], int(os.getenv("SMTP_PORT", "465")), context=ssl.create_default_context(), timeout=30) as smtp:
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(msg)
    print("Relatório enviado.")

if __name__ == "__main__":
    main()
