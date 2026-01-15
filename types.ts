export interface NodeInfo {
  nodeId: string;
  nodeName: string;
  fieldName: string;
  fieldValue: string;
  fieldType: 'IMAGE' | 'AUDIO' | 'VIDEO' | 'STRING' | 'INT' | 'FLOAT' | 'LIST' | 'SWITCH';
  description?: string;
  fieldData?: string; // Often contains options for LIST types (sometimes JSON string, sometimes comma separated)
}

export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface UploadData {
  fileName: string;
  fileType: string;
}

export interface SubmitTaskData {
  taskId: string;
  promptTips?: string; // JSON string containing node_errors
}

export interface TaskOutput {
  fileUrl: string;
  fileType?: string;
}

export interface HistoryItem {
  id: string; // Local Task ID
  remoteTaskId?: string; // RunningHub Task ID
  timestamp: number;
  startTime: number;
  endTime?: number;
  appName?: string;
  appId?: string;
  error?: string;
  outputs: TaskOutput[];
  status: 'SUCCESS' | 'FAILED';
}

export interface TaskStatusData {
  status: string; // Not explicitly in API, but inferred from logic
  failedReason?: {
    node_name: string;
    exception_message: string;
    traceback: string;
  };
  fileUrl?: string; // Present when finished in some endpoints
}

export enum AppStep {
  CONFIG = 0,
  EDITOR = 1,
  RUNNING = 2,
  RESULT = 3,
}

export interface PromptTips {
  result: boolean;
  error: string | null;
  node_errors: Record<string, string>;
}

export interface Favorite {
  name: string;
  webappId: string;
}

export interface AccountInfo {
  remainCoins: string;
  currentTaskCounts: string;
  remainMoney: string | null;
  currency: string | null;
  apiType: string;
}

export interface AutoSaveConfig {
  enabled: boolean;
  directoryName: string | null;
}

export interface InstalledApp {
  id: string; // UUID
  webappId: string;
  name: string;
  coverStyle: string; // CSS gradient string or image URL
  description?: string;
  createdAt: number;
}

export interface AppConfig {
  apiKey: string;
  autoSave: AutoSaveConfig;
}

export type TaskStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'QUEUED';

export interface BackgroundTask {
  id: string; // Local Task ID
  remoteTaskId?: string; // RunningHub Task ID (from API)
  appId: string; // InstalledApp ID
  appName: string;
  status: TaskStatus;
  progress: number; // 0-100
  startTime: number;
  endTime?: number;
  params: NodeInfo[];
  batchIndex?: number; // If part of a batch
  totalBatch?: number; // Total items in batch
  result?: TaskOutput[];
  error?: string;
}
