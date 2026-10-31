import ExcelJS from "exceljs";
import { strToU8, unzipSync, zipSync } from "fflate";

export interface ParsedRow {
  full_name: string;
  rank: string | null;
  position: string | null;
  class_name: string;
  squad_name: string | null;
  phone: string | null;
  address: string | null;
  note: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  errors: string[];
  format: "xlsx" | "docx" | "csv";
}

export const HEADERS = [
  "STT",
  "Họ và tên",
  "Cấp bậc",
  "Chức vụ",
  "Lớp",
  "Tiểu đội",
  "Điện thoại",
  "Địa chỉ",
  "Ghi chú",
];

const plain = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const ALIASES: Record<keyof Omit<ParsedRow, "full_name" | "class_name"> | "full_name" | "class_name", string[]> = {
  full_name: ["ho va ten", "ho ten", "ho ten quan nhan", "ten quan nhan", "ho dem va ten", "ten", "quan nhan"],
  rank: ["cap bac", "quan ham", "cap hieu"],
  position: ["chuc vu", "chuc danh", "nhiem vu"],
  class_name: ["lop", "lop hoc", "ten lop", "ma lop", "don vi"],
  squad_name: ["tieu doi", "to", "trung doi", "don vi nho"],
  phone: ["so dien thoai", "dien thoai", "sdt", "dt", "phone"],
  address: ["dia chi", "que quan", "noi o", "dia chi thuong tru"],
  note: ["ghi chu", "note", "ghi chu them"],
};

type Field = keyof typeof ALIASES;

function mapHeaders(cells: string[]) {
  const map = new Map<Field, number>();
  cells.forEach((cell, i) => {
    const key = plain(cell);
    if (!key) return;
    for (const field of Object.keys(ALIASES) as Field[]) {
      if (ALIASES[field].includes(key) && !map.has(field)) map.set(field, i);
    }
  });
  return map;
}

function toRow(cells: string[], header: Map<Field, number>): ParsedRow | null {
  const get = (f: Field) => {
    const i = header.get(f);
    if (i == null) return "";
    return (cells[i] ?? "").replace(/\s+/g, " ").trim();
  };
  const full_name = get("full_name");
  const class_name = get("class_name");
  if (!full_name || !class_name) return null;
  return {
    full_name,
    class_name,
    rank: get("rank") || null,
    position: get("position") || null,
    squad_name: get("squad_name") || null,
    phone: (get("phone") || "").replace(/\s/g, "") || null,
    address: get("address") || null,
    note: get("note") || null,
  };
}

function fromMatrix(matrix: string[][], errors: string[]): ParsedRow[] {
  const headerAt = matrix.findIndex(
    (row) => row.map(plain).includes("ho va ten") && row.map(plain).includes("lop"),
  );
  if (headerAt === -1) {
    errors.push(
      "Không thấy dòng tiêu đề. Cần có cột “Họ và tên” và cột “Lớp”. Tải file mẫu để đúng cột.",
    );
    return [];
  }

  const header = mapHeaders(matrix[headerAt]);
  const rows: ParsedRow[] = [];
  for (let i = headerAt + 1; i < matrix.length; i += 1) {
    const cells = matrix[i];
    if (!cells || cells.every((c) => !c || !c.trim())) continue;
    const row = toRow(cells, header);
    if (!row) {
      const name = cells[header.get("full_name") ?? 1] ?? "";
      if (name.trim()) errors.push(`Dòng ${i + 1}: thiếu lớp của “${name.trim()}” — đã bỏ qua.`);
      continue;
    }
    rows.push(row);
  }
  return rows;
}

function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    try {
      return new TextDecoder("windows-1258").decode(bytes);
    } catch {
      return new TextDecoder("latin1").decode(bytes);
    }
  }
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cell += ch;
      continue;
    }
    if (ch === '"') quoted = true;
    else if (ch === "," || ch === ";" || ch === "\t") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "object") {
    const v = value as {
      text?: string;
      richText?: { text: string }[];
      result?: ExcelJS.CellValue;
      hyperlink?: string;
    };
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join("").trim();
    if (typeof v.text === "string") return v.text.trim();
    if (v.result != null) return cellText(v.result);
  }
  return "";
}

function parseDocx(buf: ArrayBuffer): string[][] {
  const files = unzipSync(new Uint8Array(buf));
  const entry = files["word/document.xml"];
  if (!entry) throw new Error("Tệp .docx không có word/document.xml");
  const xml = new TextDecoder("utf-8").decode(entry);

  const table = /<w:tbl(?:\s[^>]*)?>([\s\S]*?)<\/w:tbl>/.exec(xml);
  if (!table) throw new Error("Không thấy bảng nào trong tệp Word.");

  const rows: string[][] = [];
  for (const tr of table[1].matchAll(/<w:tr(?:\s[^>]*)?>([\s\S]*?)<\/w:tr>/g)) {
    const cells: string[] = [];
    for (const tc of tr[1].matchAll(/<w:tc(?:\s[^>]*)?>([\s\S]*?)<\/w:tc>/g)) {
      const text = [...tc[1].matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((m) => m[1])
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/_x000D_/g, "")
        .trim();
      cells.push(text);
    }
    if (cells.length) rows.push(cells);
  }
  return rows;
}

export async function parseRosterFile(file: File): Promise<ParseResult> {
  const name = file.name.toLowerCase();
  const buf = await file.arrayBuffer();
  const errors: string[] = [];

  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(
      Buffer.from(buf) as unknown as Parameters<typeof wb.xlsx.load>[0],
    );
    const ws = wb.worksheets[0];
    if (!ws) throw new Error("Tệp Excel không có trang tính nào.");
    const matrix: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      row.eachCell({ includeEmpty: true }, (cell, col) => {
        cells[col - 1] = cellText(cell.value);
      });
      matrix.push(cells);
    });
    return { format: "xlsx", rows: fromMatrix(matrix, errors), errors };
  }

  if (name.endsWith(".docx")) {
    return { format: "docx", rows: fromMatrix(parseDocx(buf), errors), errors };
  }

  if (name.endsWith(".csv") || name.endsWith(".txt")) {
    return { format: "csv", rows: fromMatrix(parseCsv(decodeText(buf)), errors), errors };
  }

  throw new Error("Chỉ nhận tệp .xlsx, .docx, .csv hoặc .txt.");
}

// ----------------------------------------------------------------- mẫu nhập
export async function buildXlsxTemplate(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Đại đội 5";
  const ws = wb.addWorksheet("Danh sách");

  ws.columns = [
    { header: "STT", key: "stt", width: 6 },
    { header: "Họ và tên", key: "ten", width: 26 },
    { header: "Cấp bậc", key: "cap", width: 10 },
    { header: "Chức vụ", key: "chuc", width: 10 },
    { header: "Lớp", key: "lop", width: 12 },
    { header: "Tiểu đội", key: "doi", width: 12 },
    { header: "Điện thoại", key: "sdt", width: 15 },
    { header: "Địa chỉ", key: "dc", width: 32 },
    { header: "Ghi chú", key: "gc", width: 22 },
  ];

  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDDE2D0" },
  };

  const samples = [
    [1, "Nguyễn Văn An", "H2", "HV", "K4", "Tiểu đội 1", "0912345678", "Xã Đông Sơn, Thanh Hóa", ""],
    [2, "Trần Thị Bình", "H1", "HV", "K4", "Tiểu đội 1", "", "Phường Tân Dân, Thanh Hóa", "Mới nhập học"],
  ];
  samples.forEach((s) => ws.addRow(s));

  const note = ws.addRow([
    "Xoá 2 dòng ví dụ trước khi nhập. Cột “Họ và tên” và “Lớp” là bắt buộc; lớp mới sẽ được tạo tự động.",
  ]);
  ws.mergeCells(note.number, 1, note.number, 9);
  note.font = { italic: true, color: { argb: "FF585D4C" } };

  return Buffer.from(await wb.xlsx.writeBuffer());
}

function docxCell(text: string) {
  return `<w:tc><w:tcPr><w:tcW w:w="0" w:type="auto"/></w:tcPr><w:p><w:r><w:rPr><w:sz w:val="22"/></w:rPr><w:t xml:space="preserve">${text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")}</w:t></w:r></w:p></w:tc>`;
}

export function buildDocxTemplate(): Uint8Array<ArrayBuffer> {
  const header = HEADERS.map(docxCell).join("");
  const rows = [
    ["1", "Nguyễn Văn An", "H2", "HV", "K4", "Tiểu đội 1", "0912345678", "Xã Đông Sơn, Thanh Hóa", ""],
    ["2", "Trần Thị Bình", "H1", "HV", "K4", "Tiểu đội 1", "", "Phường Tân Dân, Thanh Hóa", "Mới nhập học"],
  ]
    .map((r) => `<w:tr>${r.map(docxCell).join("")}</w:tr>`)
    .join("");

  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:rPr><w:b/><w:sz w:val="28"/></w:rPr><w:t>DANH SÁCH QUÂN NHÂN</w:t></w:r></w:p>
<w:p><w:r><w:rPr><w:i/><w:sz w:val="20"/></w:rPr><w:t>Xoá hai dòng ví dụ trước khi nhập. Cột “Họ và tên” và “Lớp” là bắt buộc.</w:t></w:r></w:p>
<w:tbl><w:tblPr><w:tblW w:w="0" w:type="auto"/><w:tblBorders>
<w:top w:val="single" w:sz="6" w:color="ADB29D"/><w:left w:val="single" w:sz="6" w:color="ADB29D"/>
<w:bottom w:val="single" w:sz="6" w:color="ADB29D"/><w:right w:val="single" w:sz="6" w:color="ADB29D"/>
<w:insideH w:val="single" w:sz="4" w:color="D2D4C4"/><w:insideV w:val="single" w:sz="4" w:color="D2D4C4"/>
</w:tblBorders></w:tblPr>
<w:tr>${header}</w:tr>${rows}</w:tbl>
<w:p/>
<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>
</w:body></w:document>`;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`),
    "word/document.xml": strToU8(document),
  };

  return new Uint8Array(zipSync(files, { level: 6 }));
}
