import fs from "fs";
import path from "path";

import { DateTime } from "luxon";
import { google } from "googleapis";
import { GetFileList, GetFolderTree } from "google-drive-getfilelist";

import { BasePage as BaseService } from "~/fixtures/pages/base.page";

export class GDriveService extends BaseService {
  url = "https://www.googleapis.com/auth/drive";
  title = "";

  private drive = this.connect();
  private fields = "files(name,id)";

  private connect() {
    const { GDRIVE_CLIENT_EMAIL, GDRIVE_PKEY } = process.env;
    const { JWT } = google.auth;
    const auth = new JWT(GDRIVE_CLIENT_EMAIL, null, GDRIVE_PKEY.replace(/\|/g,"\n"), [this.url]);
    const connection = google.drive({ version: "v3", auth });
    return { auth, connection };
  }

  private getResource(id: string) {
    const { auth } = this.drive;
    return { auth, id, fields: this.fields };
  }

  private async getFolderTree(id: string) {
    const resource = this.getResource(id);
    return new Promise<{
      names: string[];
      id: string[][];
    }>((resolve, reject) => GetFolderTree(resource, (e: Error, r: any) => (e ? reject(e) : resolve(r))));
  }

  private async getFileList(id: string) {
    const resource = this.getResource(id);
    return new Promise<{
      fileList: [{ files: [{ id: string, name: string }], folderTree: string[] }];
      folderTree: { folders: string[], id: string[][], names: string[] };
      id: string[][];
    }>((resolve, reject) => GetFileList(resource, (e: Error, r: any) => (e ? reject(e) : resolve(r))));
  }

  private getCurrentDayQFolderName() {
    const now = DateTime.now();
    return now.toFormat("yyyy-Qq");
  }

  private async getCurrentDayQFolderId() {
    try {
      const { GDRIVE_RECEIPTS_FOLDER } = process.env;
      const { names, id: ids } = await this.getFolderTree(GDRIVE_RECEIPTS_FOLDER);
      const folderName = this.getCurrentDayQFolderName();
      const index = names.findIndex((i) => i == this.getCurrentDayQFolderName());

      if (index >= 0) {
        const [, id] = ids[index];
        return id;
      } else {
        const response = await this.createFolder({ name: folderName, folderId: GDRIVE_RECEIPTS_FOLDER })
        const { id } = response.data
        return id;
      }
    } catch (e) {
      this.logger.error(e.message)
    }
  }

  private async uploadFile(args: { name: string, mimeType: string, folderId: string, body?: any }) {
    const { name, mimeType, folderId, body } = args;

    return await this.drive.connection.files.create({
      requestBody: { name, parents: [folderId] },
      media: { mimeType, body },
    });
  }

  private async createFolder(args: { name: string, folderId: string }) {
    const { name, folderId } = args;
    const mimeType = "application/vnd.google-apps.folder";

    return await this.drive.connection.files.create({
      requestBody: { name, parents: [folderId], mimeType },
    });
  }

  async getSFOSInvoices() {
    const folderId = await this.getCurrentDayQFolderId();
    const { fileList } = folderId ? await this.getFileList(folderId) : { fileList: [] };

    if (fileList.length > 0) {
      const { files } = fileList[0];
      const invoices = files.filter((i: any) => i.name.match(/^[\d]{8}_PC_OR_CIPC_SI.+$/)).map((i: any) => i.name);
      return invoices;
    }

    return fileList as string[];
  }

  async uploadDownloadedSFOSInvoices() {
    const { downloadsDir } = this.config;
    const { driveFilesToUpload } = this.parameters;

    const mimeType = "application/pdf";
    const folderId = await this.getCurrentDayQFolderId();

    if (folderId) {
      const numberOfFiles = driveFilesToUpload.length
      for (let i = 0; i < numberOfFiles; i++) {
        const download = driveFilesToUpload[i];
        const name = driveFilesToUpload[i];
        const filepath = path.join(downloadsDir, download);
        const body = fs.createReadStream(filepath);
        await this.uploadFile({ name, mimeType, folderId, body });
      }
      this.logger.info("Uploaded %s files.", numberOfFiles);
    } else {
      this.logger.warn("Folder ID is empty.");
    }
  }
}
