import ExcelJS from "exceljs";

const ORANGE = "FFF37022";
const WHITE = "FFFFFFFF";
const HEADER_BG = "FFF37022";
const TOTAL_BG = "FFFFF3E0";
const ROW_ALT = "FFFFF8F4";
const GREEN_FONT = "FF059669";
const RED_FONT = "FFEF4444";
const BORDER_COLOR = "FFE5E7EB";

function border(): Partial<ExcelJS.Borders> {
  const side = { style: "thin" as const, color: { argb: BORDER_COLOR } };
  return { top: side, bottom: side, left: side, right: side };
}

async function downloadBuffer(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface TransactionRow {
  date: string;
  type: string;
  description: string;
  category: string;
  supplier: string;
  user: string;
  revenue: string;
  expense: string;
  notes: string;
}

export async function exportTransactionsToExcel(
  eventName: string,
  rows: TransactionRow[]
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Grão Eventos";
  const ws = wb.addWorksheet("Lançamentos");

  ws.columns = [
    { key: "date",        width: 13 },
    { key: "type",        width: 11 },
    { key: "description", width: 34 },
    { key: "category",    width: 20 },
    { key: "supplier",    width: 22 },
    { key: "user",        width: 22 },
    { key: "revenue",     width: 16 },
    { key: "expense",     width: 16 },
    { key: "notes",       width: 32 },
  ];

  // Header row
  const headers = ["Data", "Tipo", "Descrição", "Categoria", "Fornecedor", "Usuário", "Receita (R$)", "Despesa (R$)", "Observações"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: false };
    cell.border = border();
  });

  // Data rows
  let totalRevenue = 0;
  let totalExpense = 0;

  rows.forEach((r, i) => {
    const row = ws.addRow([r.date, r.type, r.description, r.category, r.supplier, r.user, r.revenue, r.expense, r.notes]);
    row.height = 18;

    const isAlt = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT } };
      }
      cell.border = border();
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: col <= 2 ? "center" : "left" };
    });

    // Revenue cell (col 7)
    if (r.revenue) {
      const cell = row.getCell(7);
      cell.font = { bold: true, color: { argb: GREEN_FONT }, name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "right" };
    }
    // Expense cell (col 8)
    if (r.expense) {
      const cell = row.getCell(8);
      cell.font = { bold: true, color: { argb: RED_FONT }, name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "right" };
    }

    const rev = parseFloat(r.revenue.replace(",", ".")) || 0;
    const exp = parseFloat(r.expense.replace(",", ".")) || 0;
    totalRevenue += rev;
    totalExpense += exp;
  });

  // Total row
  const fmt = (v: number) => v.toFixed(2).replace(".", ",");
  const totalRow = ws.addRow(["", "", "", "", "", "TOTAL", fmt(totalRevenue), fmt(totalExpense), ""]);
  totalRow.height = 22;
  totalRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BG } };
    cell.font = { bold: true, name: "Calibri", size: 11 };
    cell.border = border();
    cell.alignment = { vertical: "middle", horizontal: col <= 5 ? "center" : "right" };
  });
  totalRow.getCell(7).font = { bold: true, color: { argb: GREEN_FONT }, name: "Calibri", size: 11 };
  totalRow.getCell(8).font = { bold: true, color: { argb: RED_FONT }, name: "Calibri", size: 11 };

  // Resultado row
  const result = totalRevenue - totalExpense;
  const resultRow = ws.addRow(["", "", "", "", "", "RESULTADO", result >= 0 ? fmt(result) : "", result < 0 ? fmt(Math.abs(result)) : ""]);
  resultRow.height = 22;
  const resultColor = result >= 0 ? GREEN_FONT : RED_FONT;
  resultRow.eachCell({ includeEmpty: true }, (cell, col) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: result >= 0 ? "FFD1FAE5" : "FFFEE2E2" } };
    cell.font = { bold: true, color: col >= 6 ? { argb: resultColor } : { argb: "FF374151" }, name: "Calibri", size: 11 };
    cell.border = border();
    cell.alignment = { vertical: "middle", horizontal: col <= 5 ? "center" : "right" };
  });

  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  ws.autoFilter = { from: "A1", to: "I1" };

  await downloadBuffer(wb, `${eventName.replace(/\s+/g, "_")}_lancamentos.xlsx`);
}

export interface SupplierRow {
  name: string;
  contact: string;
  phone: string;
  email: string;
  item: string;
  notes: string;
}

export async function exportSuppliersToExcel(rows: SupplierRow[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Grão Eventos";
  const ws = wb.addWorksheet("Fornecedores");

  ws.columns = [
    { key: "name",    width: 28 },
    { key: "contact", width: 24 },
    { key: "phone",   width: 18 },
    { key: "email",   width: 28 },
    { key: "item",    width: 28 },
    { key: "notes",   width: 36 },
  ];

  const headers = ["Nome", "Contato", "Telefone", "E-mail", "Item Fornecido", "Observações"];
  const headerRow = ws.addRow(headers);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BG } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 11, name: "Calibri" };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = border();
  });

  rows.forEach((r, i) => {
    const row = ws.addRow([r.name, r.contact, r.phone, r.email, r.item, r.notes]);
    row.height = 18;
    const isAlt = i % 2 === 1;
    row.eachCell({ includeEmpty: true }, (cell) => {
      if (isAlt) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ROW_ALT } };
      }
      cell.border = border();
      cell.font = { name: "Calibri", size: 10 };
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  ws.views = [{ state: "frozen", ySplit: 1, xSplit: 0 }];
  ws.autoFilter = { from: "A1", to: "F1" };

  await downloadBuffer(wb, "fornecedores.xlsx");
}
