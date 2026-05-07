"""
code_to_pdf.py
Zet alle .astro, .js en .css bestanden in je projectmap om naar één PDF met inhoudsopgave.

Installatie (eenmalig):
    pip install reportlab

Gebruik:
    python code_to_pdf.py                  → zoekt in de huidige map
    python code_to_pdf.py /pad/naar/project → zoekt in opgegeven map
"""

import os
import sys
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, Preformatted
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfgen import canvas

# ── Instellingen ─────────────────────────────────────────────────────────────
EXTENSIONS = [".js"]
OUTPUT_FILE = "code_export.pdf"
SKIP_DIRS   = {"node_modules", ".git", "dist", ".astro", "__pycache__", ".cache"}
# ─────────────────────────────────────────────────────────────────────────────


def verzamel_bestanden(root: Path) -> list[Path]:
    """Zoek recursief alle bestanden met de juiste extensie."""
    bestanden = []
    for pad in sorted(root.rglob("*")):
        if any(deel in SKIP_DIRS for deel in pad.parts):
            continue
        if pad.suffix in EXTENSIONS and pad.is_file():
            bestanden.append(pad)
    return bestanden


class PaginaNummering(canvas.Canvas):
    """Canvas dat paginanummers onderaan toevoegt."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pagina_opslag = []

    def showPage(self):
        self._pagina_opslag.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        totaal = len(self._pagina_opslag)
        for toestand in self._pagina_opslag:
            self.__dict__.update(toestand)
            self._teken_paginanummer(totaal)
            super().showPage()
        super().save()

    def _teken_paginanummer(self, totaal: int):
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.grey)
        tekst = f"Pagina {self._pageNumber} van {totaal}"
        self.drawCentredString(A4[0] / 2, 1 * cm, tekst)


def maak_pdf(bestanden: list[Path], root: Path, uitvoer: str):
    doc = SimpleDocTemplate(
        uitvoer,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2.5 * cm,
        bottomMargin=2.5 * cm,
    )

    styles = getSampleStyleSheet()

    # Aangepaste stijlen
    titel_stijl = ParagraphStyle(
        "Titel",
        parent=styles["Title"],
        fontSize=22,
        spaceAfter=6,
        textColor=colors.HexColor("#1e293b"),
    )
    subtitel_stijl = ParagraphStyle(
        "Subtitel",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=20,
        alignment=TA_CENTER,
    )
    inhoudsopgave_stijl = ParagraphStyle(
        "IOEntry",
        parent=styles["Normal"],
        fontSize=9,
        leading=16,
        textColor=colors.HexColor("#334155"),
    )
    bestand_kop_stijl = ParagraphStyle(
        "BestandKop",
        parent=styles["Heading2"],
        fontSize=12,
        textColor=colors.HexColor("#0f172a"),
        backColor=colors.HexColor("#f1f5f9"),
        borderPad=6,
        spaceBefore=4,
        spaceAfter=6,
    )
    pad_stijl = ParagraphStyle(
        "Pad",
        parent=styles["Normal"],
        fontSize=7,
        textColor=colors.HexColor("#94a3b8"),
        spaceAfter=4,
    )
    code_stijl = ParagraphStyle(
        "Code",
        parent=styles["Code"],
        fontSize=7.5,
        leading=11,
        fontName="Courier",
        textColor=colors.HexColor("#1e293b"),
        backColor=colors.HexColor("#f8fafc"),
        borderColor=colors.HexColor("#e2e8f0"),
        borderWidth=0.5,
        borderPad=8,
        spaceAfter=8,
    )

    # Kleur per extensie
    ext_kleur = {
        ".astro": colors.HexColor("#7c3aed"),
        ".js":    colors.HexColor("#ca8a04"),
        ".css":   colors.HexColor("#0891b2"),
    }

    inhoud = []

    # ── Titelblad ────────────────────────────────────────────────────────────
    inhoud.append(Spacer(1, 3 * cm))
    inhoud.append(Paragraph("Code Export", titel_stijl))
    inhoud.append(Paragraph(f"{len(bestanden)} bestanden · {root.name}", subtitel_stijl))
    inhoud.append(Spacer(1, 0.5 * cm))

    # Statistieken per extensie
    stats = {}
    for b in bestanden:
        stats[b.suffix] = stats.get(b.suffix, 0) + 1

    tabel_data = [["Type", "Aantal bestanden"]]
    for ext, aantal in sorted(stats.items()):
        tabel_data.append([ext, str(aantal)])

    stat_tabel = Table(tabel_data, colWidths=[4 * cm, 5 * cm])
    stat_tabel.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1e293b")),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1),
         [colors.HexColor("#f8fafc"), colors.HexColor("#f1f5f9")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ALIGN",       (1, 0), (1, -1), "CENTER"),
        ("TOPPADDING",  (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    inhoud.append(stat_tabel)
    inhoud.append(PageBreak())

    # ── Inhoudsopgave ────────────────────────────────────────────────────────
    inhoud.append(Paragraph("Inhoudsopgave", styles["Heading1"]))
    inhoud.append(Spacer(1, 0.3 * cm))

    for i, bestand in enumerate(bestanden, 1):
        relatief = bestand.relative_to(root)
        kleur = ext_kleur.get(bestand.suffix, colors.grey)
        kleur_hex = kleur.hexval() if hasattr(kleur, "hexval") else "#666666"
        tekst = (
            f'<font color="{kleur_hex}"><b>{bestand.suffix}</b></font> '
            f'&nbsp; {relatief}'
        )
        inhoud.append(Paragraph(f"{i:>3}. {tekst}", inhoudsopgave_stijl))

    inhoud.append(PageBreak())

    # ── Bestanden ─────────────────────────────────────────────────────────────
    for i, bestand in enumerate(bestanden, 1):
        relatief = bestand.relative_to(root)
        kleur = ext_kleur.get(bestand.suffix, colors.grey)

        # Koptekst
        kleur_hex = kleur.hexval() if hasattr(kleur, "hexval") else "#666666"
        inhoud.append(
            Paragraph(
                f'<font color="{kleur_hex}">■</font> &nbsp;{bestand.name}',
                bestand_kop_stijl,
            )
        )
        inhoud.append(Paragraph(str(relatief), pad_stijl))

        # Code inhoud
        try:
            code_tekst = bestand.read_text(encoding="utf-8", errors="replace")
        except Exception as e:
            code_tekst = f"[Fout bij lezen: {e}]"

        if code_tekst.strip():
            # Escape XML-tekens voor ReportLab
            veilige_code = (
                code_tekst
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
            )
            inhoud.append(Preformatted(veilige_code, code_stijl))
        else:
            inhoud.append(Paragraph("<i>(leeg bestand)</i>", styles["Italic"]))

        # Nieuwe pagina na elk bestand (behalve de laatste)
        if i < len(bestanden):
            inhoud.append(PageBreak())

    # ── Bouwen ───────────────────────────────────────────────────────────────
    doc.build(inhoud, canvasmaker=PaginaNummering)
    print(f"✅ PDF opgeslagen als: {uitvoer}")


def main():
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd()
    root = root.resolve()

    if not root.is_dir():
        print(f"❌ Map niet gevonden: {root}")
        sys.exit(1)

    print(f"📂 Map: {root}")
    bestanden = verzamel_bestanden(root)

    if not bestanden:
        print("⚠️  Geen .astro, .js of .css bestanden gevonden.")
        sys.exit(0)

    print(f"📄 {len(bestanden)} bestanden gevonden:")
    for b in bestanden:
        print(f"   {b.relative_to(root)}")

    uitvoer = str(root / OUTPUT_FILE)
    maak_pdf(bestanden, root, uitvoer)


if __name__ == "__main__":
    main()