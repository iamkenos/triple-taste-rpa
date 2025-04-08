export type DriveResource = {
  /** the unique resource identifier */
  id?: string;
  /** the resource file or folder name */
  name?: string;
};

export type DriveFetchResourceFilter = {
  filter?: (resource: DriveFetchResourceInfo) => boolean;
};

export type DriveFetchFolderFilter = {
  includeSelf?: boolean;
} & DriveFetchResourceFilter;

export type DriveFetchResourceInfo = Required<DriveResource>;

export type DriveCreateFolderInfo = {
  /** the folder id of where to create the resource */
  parent: string;
  /** the folder name of the resource to create */
  foldername: string;
};

export type DriveCreateResourceInfo = {
  /** the folder id of where to create the resource */
  parent: string;
  /** the file name of the resource to create */
  filename: string;
  /** the content of the resource to create */
  body: any;
  /** the media type of the resource to create */
  mimeType: string;
};

export type GetFolderTreeResult = {
  /** the names of all the sub folders of the queried resource;
   *  the queried resource is always the first item in the list */
  names: string[];
  /** the resource ids of all the sub folders of the queried resource;
   *  the queried resource is always the first item in the list */
  folders: string[];
  /** the nested resource ids of all the sub folders of the queried resource;
   *  the queried resource is always the first item in the list
   *  and succeeding items will include the ancestor's resource ids */
  ids: string[][];
};

export type GetFileListResult = {
  fileList: { files: DriveFetchResourceInfo[]; folderTree: string[] }[];
  folderTree: GetFolderTreeResult;
  /** the total number of files within the queried resource */
  totalNumberOfFiles: number;
  /** the total number of files within the queried resource, including self */
  totalNumberOfFolders: number;
};
