import fs from "fs";

export const MimeType = {
  PDF: "application/pdf",
  GDRIVE_FOLDER: "application/vnd.google-apps.folder"
};

export const Ext = {
  PDF: "pdf"
};

export function readContent(path: string) {
  return fs.readFileSync(path, "utf8");
}
