/**
 * 文件相关工具函数
 */

import { FileType } from '../types';

/**
 * 根据 URL 判断文件类型
 * @param url 文件 URL
 * @returns 文件类型
 */
export const getFileType = (url: string): FileType => {
  if (!url) return 'unknown';
  const lowerUrl = url.toLowerCase();
  
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|ico|tiff?)$/i.test(lowerUrl)) return 'image';
  if (/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/i.test(lowerUrl)) return 'video';
  if (/\.(mp3|wav|ogg|flac|aac|m4a|wma)$/i.test(lowerUrl)) return 'audio';
  
  return 'unknown';
};

/**
 * 判断字符串是否为 URL
 * @param str 待检测字符串
 * @returns 是否为 URL
 */
export const isUrl = (str: string): boolean => {
  return /^(https?:\/\/|data:)/i.test(str);
};

/**
 * 从 URL 中提取文件名
 * @param url 文件 URL
 * @returns 文件名
 */
export const getFileNameFromUrl = (url: string): string => {
  try {
    const urlPath = new URL(url).pathname;
    return urlPath.split('/').pop() || `file_${Date.now()}`;
  } catch {
    return `file_${Date.now()}`;
  }
};

/**
 * 获取文件扩展名
 * @param filename 文件名
 * @returns 扩展名（不含点）
 */
export const getFileExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(lastDot + 1).toLowerCase() : '';
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 格式化后的文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${units[i]}`;
};

/**
 * 下载文件
 * @param url 文件 URL
 * @param filename 可选的文件名
 */
export const downloadFile = async (url: string, filename?: string): Promise<void> => {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename || getFileNameFromUrl(url));
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    // 降级方案：直接打开
    window.open(url, '_blank');
  }
};
