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
  private RECIEPTS_Q_FOLDER_NAME_FORMAT = "yyyy-Qq";

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

  private async createQFolder(name: string) {
    const { GDRIVE_RECEIPTS_FOLDER } = process.env;
    const { names, id: ids } = await this.getFolderTree(GDRIVE_RECEIPTS_FOLDER);
    const index = names.findIndex((i) => i == name);
    const isCurrentDayQFolderExisting = index >= 0
    
    if (isCurrentDayQFolderExisting) {
      const [, id] = ids[index];
      return id;
    } else {
      const response = await this.createFolder({ name, folderId: GDRIVE_RECEIPTS_FOLDER });
      const { id } = response.data
      return id;
    } 
  }

  async getSFOSInvoices() {
    const { GDRIVE_RECEIPTS_FOLDER } = process.env;
    const { id: ids } = await this.getFolderTree(GDRIVE_RECEIPTS_FOLDER);
    const [_, ...rest] = ids;

    const invoices = (await Promise.all(rest.map(async ([_, id]) => {
      const { fileList } = await this.getFileList(id)
      if (fileList.length > 0) {
        const { files } = fileList[0];
        const invoices = files.filter((i: any) => i.name.match(/^[\d]{8}_PC_OR_CIPC_SI.+$/)).map((i: any) => i.name);
        return invoices;
      }
    }))).flat()

    return invoices;
  }

  async uploadDownloadedSFOSInvoices() {
    const { downloadsDir } = this.config;
    const { sfosNewInvoices } = this.parameters;

    const mimeType = "application/pdf";
    const numberOfFiles = sfosNewInvoices.length
    for (let i = 0; i < numberOfFiles; i++) {
      const item = sfosNewInvoices[i];
      const { filename: name, soaDate } = item;
      const filepath = path.join(downloadsDir, name);
      const folderName = soaDate.toFormat(this.RECIEPTS_Q_FOLDER_NAME_FORMAT);
      const folderId = await this.createQFolder(folderName)

      const body = fs.createReadStream(filepath);
      await this.uploadFile({ name, mimeType, folderId, body });
    }

    this.logger.info("Uploaded %s new files.", numberOfFiles);
  }
}
