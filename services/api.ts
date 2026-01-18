import { ApiResponse, NodeInfo, SubmitTaskData, UploadData, TaskOutput } from '../types';

const API_HOST = "https://www.runninghub.cn";

// Helper to handle fetch errors
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
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
  const response = await fetch(url, {
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
 */
export const uploadFile = async (apiKey: string, file: File): Promise<UploadData> => {
  const url = `${API_HOST}/task/openapi/upload`;
  const formData = new FormData();
  formData.append('apiKey', apiKey);
  formData.append('fileType', 'input'); // As per python script
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData, // fetch automatically sets Content-Type to multipart/form-data with boundary
  });

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

  const response = await fetch(url, {
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
 */
export const queryTaskOutputs = async (apiKey: string, taskId: string): Promise<ApiResponse<TaskOutput[] | any>> => {
  const url = `${API_HOST}/task/openapi/outputs`;

  const payload = {
    apiKey,
    taskId
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

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

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload)
  });

  const json: ApiResponse<any> = await handleResponse(response);

  if (json.code !== 0) {
    throw new Error(json.msg || 'Cancel failed');
  }
};

/**
 * Get Account Info
 */
export const getAccountInfo = async (apiKey: string): Promise<{
  remainCoins: string;
  currentTaskCounts: string;
  remainMoney: string | null;
  currency: string | null;
  apiType: string;
}> => {
  const url = `${API_HOST}/uc/openapi/accountStatus`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Host': 'www.runninghub.cn',
    },
    body: JSON.stringify({ apikey: apiKey })
  });

  const json: ApiResponse<{
    remainCoins: string;
    currentTaskCounts: string;
    remainMoney: string | null;
    currency: string | null;
    apiType: string;
  }> = await handleResponse(response);

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

  const response = await fetch(url, {
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
  return json.data.records.map((app: any) => ({
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