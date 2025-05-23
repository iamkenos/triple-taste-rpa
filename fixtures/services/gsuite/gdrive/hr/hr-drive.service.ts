
import fs from "fs";

import { GDriveService } from "~/fixtures/services/gsuite/gdrive/gdrive.service";
import { MimeType } from "~/fixtures/utils/file.utils";

import type { DriveCreateFolderInfo, DriveResource } from "~/fixtures/services/gsuite/gdrive/gdrive.types";

export class HRDriveService extends GDriveService {

  async fetchFoldersUnderStaff({ id }: DriveResource) {
    const result = await this.fetchFoldersUnder({ id, includeSelf: false });
    return result;
  }

  async createPayAdviceFolderForStaff({ parent }: Partial<DriveCreateFolderInfo>) {
    const foldername = "pay advise";
    const folders = await this.fetchFoldersUnderStaff({ id: parent });
    const index = folders.findIndex(v => v.name == foldername);
    const itExists = index >= 0;

    if (itExists) {
      return folders[index].id;
    } else {
      const result = await this.createFolderUnder({ parent, foldername });
      const { id } = result.data;
      return id;
    }
  }

  async uploadNewPayAdvices() {
    const { advices } = this.parameters.gmail.staff;

    const mimeType = MimeType.PDF;
    const uploaded = await Promise.allSettled(advices
      .map(async({ payAdvisePdf, timesheetPdf }) => {
        const { driveId: parent } = payAdvisePdf;
        const folderId = await this.createPayAdviceFolderForStaff({ parent });

        const padAvise = fs.createReadStream(payAdvisePdf.filepath);
        await this.createFileUnder({ filename: payAdvisePdf.filename, mimeType, parent: folderId, body: padAvise });

        const timesheet = fs.createReadStream(timesheetPdf.filepath);
        await this.createFileUnder({ filename: timesheetPdf.filename, mimeType, parent: folderId, body: timesheet });
      }));

    const result = await this.fulfilled(uploaded);
    this.logger.debug("Uploaded %s new files.", result.length * 2);
  }
}
