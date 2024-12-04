import fs from "fs";
import path from "path";

import { google } from "googleapis";
import { GetFileList, GetFolderTree } from "google-drive-getfilelist";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";

import type { DateTime } from "luxon";

export class GDriveService extends GSuiteService {
  url = "https://www.googleapis.com/auth/drive";
  title = "";

  private drive = this.connect();
  private fields = "files(name,id)";
  private RECIEPTS_Q_FOLDER_NAME_FORMAT = "yyyy-Qq";

  private connect() {
    const auth = this.auth()
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

  async getQFolder(date: DateTime) {
    const name = date.toFormat(this.RECIEPTS_Q_FOLDER_NAME_FORMAT);
    const id = await this.createQFolder(name);
    return { name, id }
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

  async getStaffingBillingInvoicesForMonthOf(date: DateTime) {
    const qfolder = await this.getQFolder(date)
    
    const { fileList } = await this.getFileList(qfolder.id)
    if (fileList.length > 0) {
      const { files } = fileList[0];
      const invoices = files.filter((i: any) => i.name.match(/^[\d]{8}_RB_BI_.+$/)).map((i: any) => i.name);
      return invoices.filter((i: string) => i.startsWith(`${date.year}` + `${date.month}`.padStart(2, "0")));
    } else {
      return []
    }
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
