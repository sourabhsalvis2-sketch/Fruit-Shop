// generateBillPdf.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function loadImageAsBase64(url: string, format: "JPEG" | "PNG" = "JPEG", quality = 0.5) {
    const blob = await fetch(url).then((res) => res.blob());
    const bitmap = await createImageBitmap(blob);

    // Resize down if needed (for compression)
    const canvas = document.createElement("canvas");
    const maxWidth = 200; // scale down logo/signature max width
    const scale = Math.min(1, maxWidth / bitmap.width);

    canvas.width = bitmap.width * scale;
    canvas.height = bitmap.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL(`image/${format.toLowerCase()}`, quality);
}

export async function generateBillPdf(bill: any) {
    const doc = new jsPDF({
        compress: true, // enable built-in compression
    });

    // === Draw outer border ===
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277);

    // === Logo ===
    const logoBase64 = await loadImageAsBase64("/apple-logo.png", "JPEG", 0.6);
    doc.addImage(logoBase64, "JPEG", 90, 12, 30, 20);

    // === Header ===
    doc.setFontSize(18);
    doc.text("Sai Fruit Suppliers", 105, 40, { align: "center" });
    doc.setFontSize(11);
    doc.text("Dasara Chowk, Gadhinglaj", 105, 47, { align: "center" });
    doc.text("Mobile: 9860121156 / 9226959588", 105, 53, { align: "center" });

    doc.line(20, 57, 190, 57);

    // === Customer + Bill Info ===
    doc.setFontSize(12);
    doc.text(`Name: ${bill.customer_name}`, 20, 67);
    doc.text(`Mobile: ${bill.customer_mobile}`, 20, 75);
    doc.text(`Bill No: ${bill.bill_number}`, 140, 67);
    doc.text(`Date: ${new Date(bill.created_at).toLocaleDateString()}`, 140, 75);

    doc.line(20, 80, 190, 80);

    // === Items Table ===
    autoTable(doc, {
        startY: 85,
        head: [["Item", "Qty", "Rate", "Amount"]],
        body: bill.items.map((item: any) => [
            item.fruit,
            `${item.quantity} ${item.unit}`,
            `${item.rate}`,
            `${item.amount.toFixed(2)}`,
        ]),
        theme: "grid",
        styles: { halign: "center", fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
    });

    // === Total + Signature ===
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.line(20, finalY - 7, 190, finalY - 7);

    const stampBase64 = await loadImageAsBase64("/signature.png", "JPEG", 0.6);
    doc.addImage(stampBase64, "JPEG", 25, finalY - 5, 40, 25);
    doc.setFontSize(10);
    doc.text("Authorized Stamp and Signature", 25, finalY + 25);

    doc.setFontSize(12);
    doc.text(`TOTAL: ${bill.total_amount.toFixed(2)}`, 190, finalY, {
        align: "right",
    });

    doc.line(20, finalY + 30, 190, finalY + 30);

    // === Upload to Supabase ===
    const pdfBlob = doc.output("blob"); // compressed output
    const fileName = `bill-${bill.bill_number}.pdf`;

    const { error } = await supabase.storage
        .from("bills")
        .upload(fileName, pdfBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "application/pdf",
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
        .from("bills")
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}
