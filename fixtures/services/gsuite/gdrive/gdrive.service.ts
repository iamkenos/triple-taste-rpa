import { google } from "googleapis";
import { GetFileList, GetFolderTree } from "google-drive-getfilelist";
import { GSuiteService } from "~/fixtures/services/gsuite/gsuite.service";
import { MimeType } from "~/fixtures/utils/file.utils";

import type {
  DriveCreateFolderInfo,
  DriveCreateResourceInfo,
  DriveFetchFolderFilter,
  DriveFetchResourceFilter,
  DriveFetchResourceInfo,
  DriveResource,
  GetFileListResult,
  GetFolderTreeResult
} from "./gdrive.types";

export class GDriveService extends GSuiteService {
  url = "https://www.googleapis.com/auth/drive";
  title = "";

  private drive = this.connect();

  private connect() {
    const auth = this.auth();
    const connection = google.drive({ version: "v3", auth });
    return { auth, connection };
  }

  private buildResourceRequest({ id }: DriveResource) {
    const { auth } = this.drive;
    return { auth, id, fields: `files(${["name", "id"].join()})` };
  }

  protected async fetchFoldersUnder({ id, filter, includeSelf }: DriveResource & DriveFetchFolderFilter) {
    const request = this.buildResourceRequest({ id });
    const { names, folders } = await new Promise((resolve, reject) =>
      GetFolderTree(request, (error: Error, result: GetFolderTreeResult) =>
        (error ? reject(error) : resolve(result)))) as GetFolderTreeResult;
    const result: DriveFetchResourceInfo[] = names.map((v, i) => ({ id: folders[i], name: v }))
      .filter(filter ?? (() => true))
      .slice(includeSelf ? 0 : 1);
    return result;
  }

  protected async fetchFilesUnder({ id, filter }: DriveResource & DriveFetchResourceFilter) {
    const request = this.buildResourceRequest({ id });
    const { fileList } = await new Promise((resolve, reject) =>
      GetFileList(request, (error: Error, result: GetFileListResult) =>
        (error ? reject(error) : resolve(result)))) as GetFileListResult;
    const result: DriveFetchResourceInfo[] = fileList.flatMap(({ files }) => files).filter(filter ?? (() => true));
    return result;
  }

  protected async createFolderUnder({ parent, foldername }: DriveCreateFolderInfo) {
    const mimeType = MimeType.GDRIVE_FOLDER;
    return await this.drive.connection.files.create({
      requestBody: { name: foldername, parents: [parent], mimeType }
    });
  }

  protected async createFileUnder({ parent, filename, body, mimeType }: DriveCreateResourceInfo) {
    return await this.drive.connection.files.create({
      requestBody: { name: filename, parents: [parent] },
      media: { mimeType, body }
    });
  }

  async wipeUnshared() {
    const query = () => this.drive.connection.files.list({
      pageSize: 1000,
      q: "'me' in owners and 'root' in parents and not trashed"
      // q: "'me' in owners and name contains '202512' and name contains 'PC_OR_CIPC' and not trashed"
    });

    const response = await query();
    const { files } = response.data;
    const deleted = await Promise.allSettled(files
      .map(async({ id: fileId }) => {
        await this.drive.connection.files.delete({ fileId });
        return true;
      }));

    await this.fulfilled(deleted);
  }
}
