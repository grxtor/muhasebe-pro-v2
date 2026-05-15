/**
 * Fatura PDF üretici — jsPDF + jspdf-autotable.
 *
 * Notlar:
 * - Sadece browser'da çalışır (canvas / Image API kullanılır). Server'dan
 *   çağırmayın; bunun yerine `getFaturaForPdf` server action'ını ile veriyi
 *   çekip client tarafında bu fonksiyonu çağırın.
 * - jsPDF default fontu (Helvetica) tam UTF-8 desteklemez. Bu yüzden tüm
 *   metinler `trAscii()` ile ASCII'ye düşürülür (ç→c, ğ→g, ş→s, vs).
 *   Görsel olarak "Müşteri" yerine "Musteri" yazılır ama PDF okunabilir kalır.
 *   Tam Türkçe fontu istersek ileride Roboto / DejaVu base64 ile eklenebilir.
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatPara, formatTarih } from "@/lib/format";

/* ============================================================
   Veri sözleşmeleri (server action `getFaturaForPdf`'in çıktısı)
   ============================================================ */

export interface FaturaPdfData {
  fatura: {
    faturaNo: string;
    tarih: string; // ISO
    vadeTarihi: string | null; // ISO
    isAciklamasi: string;
    tutar: string; // Decimal string
    kdvOrani: string;
    kdvTutari: string;
    toplamTutar: string;
    paraBirimi: string;
    notlar: string | null;
    yon: string; // "Gonderilen" | "Gelen"
  };
  cari: {
    unvan: string;
    vergiNo: string | null;
    vergiDairesi: string | null;
    adres: string | null;
    sehir: string | null;
    telefon: string | null;
    email: string | null;
  };
  org: {
    sirketAdi: string | null;
    vergiNo: string | null;
    vergiDairesi: string | null;
    adres: string | null;
    sehir: string | null;
    ulke: string | null;
    telefon: string | null;
    email: string | null;
    website: string | null;
    iban: string | null;
    bankaAdi: string | null;
    logoUrl: string | null;
  };
}

/* ============================================================
   Türkçe → ASCII normalize
   ============================================================ */

const TR_MAP: Record<string, string> = {
  ç: "c",
  Ç: "C",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
  ö: "o",
  Ö: "O",
  ş: "s",
  Ş: "S",
  ü: "u",
  Ü: "U",
};

/** Türkçe karakterleri ASCII'ye düşürür — jsPDF default fontu için. */
function trAscii(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[çÇğĞıİöÖşŞüÜ]/g, (ch) => TR_MAP[ch] ?? ch);
}

/** Para tutarını "1.234,56 TL" gibi ASCII-safe biçimle formatlar. */
function paraAscii(miktar: number, currency: string): string {
  // formatPara çıktısı "₺" sembolü içerebilir — ASCII'ye düşür.
  const raw = formatPara(miktar, currency);
  // ₺ sembolünü "TL" ile değiştir, diğer Türkçe karakterleri de
  return trAscii(raw).replace(/₺/g, "TL");
}

/* ============================================================
   Logo yükleyici — data URL'e çevir
   ============================================================ */

async function loadLogoAsDataUrl(
  url: string,
): Promise<{ dataUrl: string; mime: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const mime = blob.type || "image/png";
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
    return { dataUrl, mime };
  } catch {
    return null;
  }
}

function imageFormatForJsPdf(mime: string): "PNG" | "JPEG" | "WEBP" {
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPEG";
  if (mime.includes("webp")) return "WEBP";
  return "PNG";
}

/* ============================================================
   Ana fonksiyon — Blob döner
   ============================================================ */

export async function generateFaturaPdf(params: FaturaPdfData): Promise<Blob> {
  const { fatura, cari, org } = params;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  doc.setFont("helvetica", "normal");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;

  /* ---------- 1) Logo + şirket bilgileri (sol üst) ---------- */
  const solY = margin;
  let logoYukseklik = 0;

  if (org.logoUrl) {
    const logo = await loadLogoAsDataUrl(org.logoUrl);
    if (logo) {
      try {
        const fmt = imageFormatForJsPdf(logo.mime);
        // 32mm genişlik, en-boy oranı korunarak otomatik yükseklik
        const props = doc.getImageProperties(logo.dataUrl);
        const w = 32;
        const h = (props.height / props.width) * w;
        doc.addImage(logo.dataUrl, fmt, margin, solY, w, h);
        logoYukseklik = h + 3;
      } catch {
        // Logo bozuksa sessizce geç
      }
    }
  }

  const sirketBasY = solY + logoYukseklik;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text(trAscii(org.sirketAdi ?? "Sirketim"), margin, sirketBasY);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let sirketY = sirketBasY + 5;
  const sirketSatirlar: string[] = [];
  if (org.vergiNo) {
    sirketSatirlar.push(
      `Vergi No: ${trAscii(org.vergiNo)}${org.vergiDairesi ? ` (${trAscii(org.vergiDairesi)})` : ""}`,
    );
  }
  if (org.adres) {
    sirketSatirlar.push(
      [org.adres, org.sehir, org.ulke]
        .filter(Boolean)
        .map((v) => trAscii(v ?? ""))
        .join(", "),
    );
  }
  if (org.telefon) sirketSatirlar.push(`Tel: ${trAscii(org.telefon)}`);
  if (org.email) sirketSatirlar.push(`E-posta: ${trAscii(org.email)}`);
  if (org.website) sirketSatirlar.push(`Web: ${trAscii(org.website)}`);

  for (const s of sirketSatirlar) {
    // 90mm sınırla — sağ taraftaki fatura kutusuyla çakışmasın
    const wrapped = doc.splitTextToSize(s, 90);
    doc.text(wrapped, margin, sirketY);
    sirketY += 4 * wrapped.length;
  }

  /* ---------- 2) "FATURA" başlığı + meta (sağ üst) ---------- */
  const sagX = pageW - margin;
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text("FATURA", sagX, solY + 8, { align: "right" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const metaSatirlar: Array<[string, string]> = [
    ["Fatura No", trAscii(fatura.faturaNo)],
    ["Tarih", formatTarih(fatura.tarih)],
  ];
  if (fatura.vadeTarihi) {
    metaSatirlar.push(["Vade Tarihi", formatTarih(fatura.vadeTarihi)]);
  }
  const yon = fatura.yon === "Gonderilen" ? "Gonderilen" : "Gelen";
  metaSatirlar.push(["Yon", yon]);

  let metaY = solY + 14;
  for (const [k, v] of metaSatirlar) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(`${k}:`, sagX - 40, metaY);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40);
    doc.text(v, sagX, metaY, { align: "right" });
    metaY += 5;
  }

  /* ---------- 3) Müşteri kutusu ---------- */
  const cariY = Math.max(sirketY, metaY) + 6;

  // Kutu çiz
  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.setFillColor(248, 248, 248);
  const kutuYuk = 28;
  doc.roundedRect(margin, cariY, contentW, kutuYuk, 2, 2, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(120);
  doc.text("FATURA EDILEN", margin + 4, cariY + 5);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20);
  doc.text(trAscii(cari.unvan), margin + 4, cariY + 11);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  const cariBilgiler: string[] = [];
  if (cari.vergiNo) {
    cariBilgiler.push(
      `Vergi No: ${trAscii(cari.vergiNo)}${cari.vergiDairesi ? ` (${trAscii(cari.vergiDairesi)})` : ""}`,
    );
  }
  if (cari.adres || cari.sehir) {
    cariBilgiler.push(
      [cari.adres, cari.sehir]
        .filter(Boolean)
        .map((v) => trAscii(v ?? ""))
        .join(", "),
    );
  }
  const iletisim: string[] = [];
  if (cari.telefon) iletisim.push(`Tel: ${trAscii(cari.telefon)}`);
  if (cari.email) iletisim.push(`E-posta: ${trAscii(cari.email)}`);
  if (iletisim.length) cariBilgiler.push(iletisim.join("  ·  "));

  let cariSatY = cariY + 16;
  for (const s of cariBilgiler) {
    const wrapped = doc.splitTextToSize(s, contentW - 8);
    doc.text(wrapped, margin + 4, cariSatY);
    cariSatY += 4 * wrapped.length;
  }

  /* ---------- 4) Kalemler tablosu (autotable) ---------- */
  const tabloBasY = cariY + kutuYuk + 6;
  const tutar = parseFloat(fatura.tutar);
  const kdvOrani = parseFloat(fatura.kdvOrani);
  const kdvTutari = parseFloat(fatura.kdvTutari);
  const toplam = parseFloat(fatura.toplamTutar);

  autoTable(doc, {
    startY: tabloBasY,
    margin: { left: margin, right: margin },
    head: [["Mal / Hizmet", "Tutar"]],
    body: [
      [
        trAscii(fatura.isAciklamasi),
        paraAscii(tutar, fatura.paraBirimi),
      ],
    ],
    foot: [
      ["Ara Toplam", paraAscii(tutar, fatura.paraBirimi)],
      [
        `KDV (%${kdvOrani.toString().replace(".", ",")})`,
        paraAscii(kdvTutari, fatura.paraBirimi),
      ],
      ["GENEL TOPLAM", paraAscii(toplam, fatura.paraBirimi)],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [40, 40, 40],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 10,
      halign: "left",
    },
    bodyStyles: {
      fontSize: 10,
      textColor: 40,
      cellPadding: 3,
    },
    footStyles: {
      fillColor: [248, 248, 248],
      textColor: 40,
      fontStyle: "normal",
      fontSize: 10,
      halign: "right",
    },
    columnStyles: {
      0: { cellWidth: contentW - 50, halign: "left" },
      1: { cellWidth: 50, halign: "right" },
    },
    didParseCell: (data) => {
      // Genel Toplam satırını kalın yap
      if (data.section === "foot" && data.row.index === 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 11;
        data.cell.styles.fillColor = [235, 235, 235];
      }
    },
  });

  // autoTable son Y'sini "lastAutoTable" üzerinden al
  const autoDoc = doc as unknown as {
    lastAutoTable?: { finalY: number };
  };
  let yPos = (autoDoc.lastAutoTable?.finalY ?? tabloBasY) + 10;

  /* ---------- 5) Notlar ---------- */
  if (fatura.notlar && fatura.notlar.trim().length > 0) {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80);
    doc.text("Notlar", margin, yPos);
    yPos += 4;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(80);
    const wrapped = doc.splitTextToSize(trAscii(fatura.notlar), contentW);
    doc.text(wrapped, margin, yPos);
    yPos += 4 * wrapped.length + 4;
  }

  /* ---------- 6) Footer — banka / iletişim ---------- */
  const footerY = pageH - margin - 14;

  doc.setDrawColor(220);
  doc.setLineWidth(0.2);
  doc.line(margin, footerY, pageW - margin, footerY);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);

  const sol: string[] = [];
  if (org.bankaAdi || org.iban) {
    if (org.bankaAdi) sol.push(`Banka: ${trAscii(org.bankaAdi)}`);
    if (org.iban) sol.push(`IBAN: ${trAscii(org.iban)}`);
  }
  const sag: string[] = [];
  if (org.telefon) sag.push(`Tel: ${trAscii(org.telefon)}`);
  if (org.email) sag.push(trAscii(org.email));
  if (org.website) sag.push(trAscii(org.website));

  let footY = footerY + 4;
  for (const s of sol) {
    doc.text(s, margin, footY);
    footY += 3.5;
  }
  let footYSag = footerY + 4;
  for (const s of sag) {
    doc.text(s, pageW - margin, footYSag, { align: "right" });
    footYSag += 3.5;
  }

  return doc.output("blob");
}
