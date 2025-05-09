
import fs from "fs";
import path from "path";

import { GDriveService } from "~/fixtures/services/gsuite/gdrive/gdrive.service";
import { createDate, Format } from "~/fixtures/utils/date.utils";
import { MimeType } from "~/fixtures/utils/file.utils";

import type { DateTime } from "luxon";
import type { DriveFetchResourceFilter } from "~/fixtures/services/gsuite/gdrive/gdrive.types";

export class FinancialsDriveService extends GDriveService {

  async fetchFoldersUnderReceipts({ filter }: DriveFetchResourceFilter = {}) {
    const { GDRIVE_FI_RECEIPTS_ID: id } = this.parameters.env;

    const result = await this.fetchFoldersUnder({ id, filter, includeSelf: false });
    return result;
  }

  async fetchFilesUnderReceipts({ filter }: DriveFetchResourceFilter = {}) {
    const { GDRIVE_FI_RECEIPTS_ID: id } = this.parameters.env;

    const result = await this.fetchFilesUnder({ id, filter });
    return result;
  }

  async fetchQFolderUnderReceiptsFor(date: DateTime) {
    return this.createQFolderUnderReceiptsFor(date);
  }

  async createQFolderUnderReceiptsFor(date: DateTime) {
    const foldername = date.toFormat(Format.DATE_SHORT_YQ.replace(" ", "-"));
    const folders = await this.fetchFoldersUnderReceipts();
    const index = folders.findIndex(v => v.name == foldername);
    const itExists = index >= 0;

    if (itExists) {
      return { id: folders[index].id, foldername };
    } else {
      const { GDRIVE_FI_RECEIPTS_ID: parent } = this.parameters.env;

      const result = await this.createFolderUnder({ parent, foldername });
      const { id } = result.data;
      return { id, foldername };
    }
  }

  async fetchSFOSInvoices() {
    const pattern = /^[\d]{8}_PC_OR_CIPC_SI.+$/;
    const files = await this.fetchFilesUnderReceipts({ filter: (r) => Boolean(r.name.match(pattern)) });

    const result = files.map(i => i.name);
    return result;
  }

  async uploadNewSFOSInvoices() {
    const { downloadsDir } = this.config;
    const { toUpload } = this.parameters.sfos;

    const mimeType = MimeType.PDF;
    const uploaded = await Promise.allSettled(toUpload
      .map(async({ filename: name, date }) => {
        const { id: parent } = await this.createQFolderUnderReceiptsFor(date);
        const { formatted: prefix } = createDate({ from: date, format: Format.DATE_SHORT });
        const filepath = path.join(downloadsDir, name);
        const filename = `${prefix}_PC_OR_${name}`;

        const body = fs.createReadStream(filepath);
        await this.createFileUnder({ parent, filename, body, mimeType });
      }));

    const result = await this.fulfilled(uploaded);
    this.logger.debug("Uploaded %s new files.", result.length);
  }

  async fetchAgencyBillingInvoicesForMonthOf(date: DateTime) {
    const { id } = await this.createQFolderUnderReceiptsFor(date);

    const pattern = /^[\d]{8}_RB_BI_.+$/;
    const prefix = `${date.year}` + `${date.month}`.padStart(2, "0");
    const files = await this.fetchFilesUnder({ id, filter: (r) => Boolean(r.name.match(pattern)) && r.name.startsWith(prefix) });

    const result = files.map(v => v.name);
    return result;
  }
}
