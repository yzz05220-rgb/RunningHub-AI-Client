import { ApiResponse, NodeInfo, SubmitTaskData, UploadData, TaskOutput, AccountInfo } from '../types';
import { parseHttpError } from '../utils/error';

const API_HOST = "https://www.runninghub.cn";

// 重试配置
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

/**
 * 带重试机制的 fetch 请求
 * @param url 请求 URL
 * @param options fetch 选项
 * @param config 重试配置
 * @returns Response 对象
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // 对于服务器错误（5xx），进行重试
      if (response.status >= 500 && attempt < config.maxRetries) {
        console.warn(`[API] Server error ${response.status}, retrying... (${attempt + 1}/${config.maxRetries})`);
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // 网络错误，进行重试
      if (attempt < config.maxRetries) {
        console.warn(`[API] Network error, retrying... (${attempt + 1}/${config.maxRetries}):`, lastError.message);
        const delay = Math.min(config.baseDelay * Math.pow(2, attempt), config.maxDelay);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }

  throw lastError || new Error('请求失败');
}

/**
 * 处理 API 响应
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    const error = parseHttpError(response.status, response.statusText);
    throw new Error(error.message);
  }
  const data = await response.json();
  return data;
}

// Response type for webapp details
export interface WebappDetail {
  webappName: string;
  covers: Array<{
    id: string;
    url: string;
    thumbnailUri: string;
    imageWidth: string;
    imageHeight: string;
  }>;
  statisticsInfo: {
    likeCount: string;
    useCount: string;
    collectCount: string;
  };
  tags: Array<{
    id: string;
    name: string;
  }>;
  nodeInfoList: NodeInfo[];
}

/**
 * Get Webapp Detail including nodes, name, covers, etc.
 */
export const getWebappDetail = async (apiKey: string, webappId: string): Promise<WebappDetail> => {
  const url = `${API_HOST}/api/webapp/apiCallDemo?apiKey=${apiKey}&webappId=${webappId}`;
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    }
  });

  const json: ApiResponse<WebappDetail> = await handleResponse(response);

  if (json.code !== 0 || !json.data) {
    throw new Error(json.msg || 'Failed to fetch webapp detail');
  }

  return json.data;
};

/**
 * Get Node Info List (convenience wrapper)
 */
export const getNodeList = async (apiKey: string, webappId: string): Promise<NodeInfo[]> => {
  const detail = await getWebappDetail(apiKey, webappId);
  return detail.nodeInfoList;
};

/**
 * Upload File
 * 文件上传使用较少的重试次数
 */
export const uploadFile = async (apiKey: string, file: File): Promise<UploadData> => {
  const url = `${API_HOST}/task/openapi/upload`;
  const formData = new FormData();
  formData.append('apiKey', apiKey);
  formData.append('fileType', 'input');
  formData.append('file', file);

  const response = await fetchWithRetry(url, {
    method: 'POST',
    body: formData,
  }, { ...DEFAULT_RETRY_CONFIG, maxRetries: 2 });

  const json: ApiResponse<UploadData> = await handleResponse(response);

  if (json.code !== 0) {
    throw new Error(json.msg || 'Upload failed');
  }

  return json.data;
};

/**
 * Submit Task
 */
export const submitTask = async (apiKey: string, webappId: string, nodeInfoList: NodeInfo[]): Promise<SubmitTaskData> => {
  const url = `${API_HOST}/task/openapi/ai-app/run`;

  const payload = {
    webappId,
    apiKey,
    nodeInfoList
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const json: ApiResponse<SubmitTaskData> = await handleResponse(response);

  if (json.code !== 0) {
    throw new Error(json.msg || 'Submission failed');
  }

  return json.data;
};

/**
 * Query Task Outputs (Polling)
 * 轮询接口使用较少的重试
 */
export const queryTaskOutputs = async (apiKey: string, taskId: string): Promise<ApiResponse<TaskOutput[]>> => {
  const url = `${API_HOST}/task/openapi/outputs`;

  const payload = {
    apiKey,
    taskId
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  }, { ...DEFAULT_RETRY_CONFIG, maxRetries: 1 });

  return await handleResponse(response);
};

/**
 * Cancel Task
 */
export const cancelTask = async (apiKey: string, taskId: string): Promise<void> => {
  const url = `${API_HOST}/task/openapi/cancel`;

  const payload = {
    apiKey,
    taskId
  };

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const json: ApiResponse<unknown> = await handleResponse(response);

  if (json.code !== 0) {
    throw new Error(json.msg || 'Cancel failed');
  }
};

/**
 * Get Account Info
 */
export const getAccountInfo = async (apiKey: string): Promise<AccountInfo> => {
  const url = `${API_HOST}/uc/openapi/accountStatus`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apikey: apiKey })
  });

  const json: ApiResponse<AccountInfo> = await handleResponse(response);

  if (json.code !== 0) {
    throw new Error(json.msg || 'Failed to get account info');
  }

  return json.data;
};

// --- NEW: Fetch User's Favorited AI Applications ---

export interface FavoriteAppInfo {
  id: string;
  name: string;
  intro: string;
  thumbnailUrl: string;
  owner: {
    name: string;
    avatar: string;
  };
  useCount: number;
}

/**
 * Fetch user's favorited AI applications from RunningHub
 * Requires the user's access token (Rh-Accesstoken from browser localStorage)
 */
export const getFavoriteApps = async (accessToken: string): Promise<FavoriteAppInfo[]> => {
  const url = `${API_HOST}/api/likeOrCollect/webapp/list`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      size: 50,
      current: 1,
      operateType: 2, // 2 = favorites
    })
  });

  const json = await response.json();

  if (json.code !== 0 || !json.data?.records) {
    throw new Error(json.msg || '获取收藏列表失败，请检查 Access Token 是否有效');
  }

  // Map the response to our simplified structure
  interface AppRecord {
    id: string;
    name: string;
    intro?: string;
    covers?: Array<{ thumbnailUri?: string }>;
    owner?: { name?: string; avatar?: string };
    statisticsInfo?: { useCount?: number };
  }
  
  return json.data.records.map((app: AppRecord) => ({
    id: app.id,
    name: app.name,
    intro: app.intro || '',
    thumbnailUrl: app.covers?.[0]?.thumbnailUri || '',
    owner: {
      name: app.owner?.name || 'Unknown',
      avatar: app.owner?.avatar || '',
    },
    useCount: app.statisticsInfo?.useCount || 0,
  }));
};

/**
 * 验证 API Key 是否有效
 * @param apiKey API Key
 * @returns 是否有效
 */
export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  try {
    await getAccountInfo(apiKey);
    return true;
  } catch {
    return false;
  }
};
