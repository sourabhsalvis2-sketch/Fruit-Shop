// generateBillPdf.ts
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateBillPdf(bill: any) {
    const doc = new jsPDF();

    // === Draw outer border ===
    doc.setLineWidth(0.5);
    doc.rect(10, 10, 190, 277); // x, y, width, height

    // === Logo ===
    const logoUrl = "/apple-logo.png";
    const logo = await fetch(logoUrl).then((res) => res.blob());
    const reader = new FileReader();
    const logoBase64: string = await new Promise((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(logo);
    });
    doc.addImage(logoBase64, "PNG", 100 - 10, 12, 20, 20);

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
            `${item.rate}`, // removed ₹
            `${item.amount.toFixed(2)}`
        ]),
        theme: "grid",
        styles: { halign: "center" },
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] }
    });

    // === Total + Signature ===
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.line(20, finalY - 7, 190, finalY - 7);

    // Signature left side
    const stampUrl = "/signature.png"; // signature image
    const stamp = await fetch(stampUrl).then((res) => res.blob());
    const stampReader = new FileReader();
    const stampBase64: string = await new Promise((resolve) => {
        stampReader.onload = () => resolve(stampReader.result as string);
        stampReader.readAsDataURL(stamp);
    });
    doc.addImage(stampBase64, "PNG", 20, finalY - 5, 40, 20);
    doc.setFontSize(10);
    doc.text("Authorized Stamp and Signature", 25, finalY + 20);

    // Total on right side
    doc.setFontSize(14);
    doc.text(`TOTAL: ${bill.total_amount.toFixed(2)}`, 190, finalY, {
        align: "right"
    });

    doc.line(20, finalY + 25, 190, finalY + 25);

    // === Upload to Supabase ===
    const pdfBlob = doc.output("blob");
    const fileName = `bill-${bill.bill_number}.pdf`;

    const { error } = await supabase.storage
        .from("bills")
        .upload(fileName, pdfBlob, {
            cacheControl: "3600",
            upsert: true,
            contentType: "application/pdf"
        });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
        .from("bills")
        .getPublicUrl(fileName);

    return publicUrlData.publicUrl;
}
