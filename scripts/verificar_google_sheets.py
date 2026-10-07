"""Relatório diário de disponibilidade usando a exportação pública do Google Sheets."""
import csv
import io
import os
import ssl
import smtplib
import time
from collections import Counter
from datetime import datetime
from email.message import EmailMessage
from urllib.request import urlopen
from zoneinfo import ZoneInfo

from enviar_dashboard import enviar_dashboard
from verificar_links import verificar

def consolidar_status(product_id, raw_status, raw_detail, state, now):
    """Exige duas detecções consecutivas de indisponibilidade antes do vermelho."""
    anterior = state.get(product_id, {})
    falhas_anteriores = int(anterior.get("failed_checks", 0) or 0)

    if raw_status == "indisponivel":
        falhas = falhas_anteriores + 1
        final = "possivelmente_indisponivel" if falhas == 1 else "indisponivel"
        state[product_id] = {
            "failed_checks": falhas,
            "status": final,
            "updated_at": now.isoformat(),
        }
        return final, falhas, f"{raw_detail}; falhas consecutivas: {falhas}"

    # Disponibilidade confirmada ou verificação inconclusiva quebra a sequência.
    state.pop(product_id, None)
    if raw_status == "disponivel":
        return "disponivel", 0, f"{raw_detail}; falhas consecutivas: 0"
    return "erro_verificacao", 0, f"{raw_detail}; falhas consecutivas: 0"


def main():
    url = os.environ["GOOGLE_SHEET_CSV_URL"]
    with urlopen(url, timeout=30) as response:
        content = response.read().decode("utf-8-sig")

    rows = list(csv.DictReader(io.StringIO(content)))
    required = {"id", "title", "affiliateLink", "active", "linkStatus", "failedChecks"}
    header = set((content.splitlines()[0].split(",")) if content.splitlines() else [])
    if not rows and not required.issubset(header):
        raise ValueError("Planilha sem cabeçalhos esperados")
    if rows and not required.issubset(rows[0]):
        raise ValueError("Cabeçalhos ausentes: " + str(required - set(rows[0])))

    products = [
        row
        for row in rows
        if row.get("id", "").strip()
        and row.get("active", "").strip().lower() in ("sim", "true", "1", "yes")
        and row.get("title", "").strip()
    ]

    now = datetime.now(ZoneInfo("America/Sao_Paulo"))
    state = {
        row.get("id", "").strip(): {
            "failed_checks": int(float(row.get("failedChecks", "0") or 0)),
            "status": row.get("linkStatus", "").strip(),
        }
        for row in products
        if row.get("id", "").strip()
    }
    summary = []
    dashboard_rows = []
    status_counts = Counter()

    for product in products:
        product_id = product.get("id", "").strip()
        raw_status, raw_detail = verificar(product.get("affiliateLink", "").strip())
        final_status, failures, detail = consolidar_status(
            product_id, raw_status, raw_detail, state, now
        )

        status_counts[final_status] += 1
        summary.append(
            f"- {product['title']}: {final_status}. {detail}"
        )
        dashboard_rows.append(
            {
                "id": product_id,
                "title": product["title"],
                "status": final_status,
                "detail": detail,
                "failed_checks": failures,
            }
        )
        time.sleep(1)

    report = (
        f"Relatório diário — Utilidades Essenciais — {now:%d/%m/%Y %H:%M}\n"
        f"Produtos ativos verificados: {len(products)}\n"
        f"Disponíveis: {status_counts['disponivel']}\n"
        f"Possivelmente indisponíveis: {status_counts['possivelmente_indisponivel']}\n"
        f"Indisponíveis: {status_counts['indisponivel']}\n"
        f"Erros de verificação: {status_counts['erro_verificacao']}\n\n"
        + ("\n".join(summary) or "Nenhum produto ativo.")
        + "\n\nA indisponibilidade só é confirmada após duas detecções consecutivas. "
        "Bloqueios e falhas temporárias ficam como erro_verificacao."
    )
    print(report)

    enviar_dashboard(now, dashboard_rows)

    required_mail = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "REPORT_TO"]
    if any(not os.getenv(key) for key in required_mail):
        print("E-mail não enviado: falta configurar secrets SMTP e REPORT_TO.")
        return

    msg = EmailMessage()
    msg["Subject"] = f"Relatório de afiliados — {now:%d/%m/%Y}"
    msg["From"] = os.environ["SMTP_USER"]
    msg["To"] = os.environ["REPORT_TO"]
    msg.set_content(report)

    with smtplib.SMTP_SSL(
        os.environ["SMTP_HOST"],
        int(os.getenv("SMTP_PORT", "465")),
        context=ssl.create_default_context(),
        timeout=30,
    ) as smtp:
        smtp.login(os.environ["SMTP_USER"], os.environ["SMTP_PASSWORD"])
        smtp.send_message(msg)
    print("Relatório enviado.")


if __name__ == "__main__":
    main()
