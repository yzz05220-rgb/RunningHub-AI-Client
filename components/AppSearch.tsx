import React, { useState, useMemo, useCallback } from 'react';
import { Search, X, SortAsc, SortDesc, Clock, Star, Hash } from 'lucide-react';

export type SortField = 'name' | 'createdAt' | 'useCount';
export type SortOrder = 'asc' | 'desc';

interface AppSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  placeholder?: string;
  showSort?: boolean;
  className?: string;
}

/**
 * 应用搜索组件
 * 支持搜索和排序功能
 */
const AppSearch: React.FC<AppSearchProps> = ({
  searchQuery,
  onSearchChange,
  sortField = 'createdAt',
  sortOrder = 'desc',
  onSortChange,
  placeholder = '搜索应用名称或 ID...',
  showSort = true,
  className = '',
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  const handleSortFieldChange = useCallback((field: SortField) => {
    if (onSortChange) {
      // 如果点击当前排序字段，切换排序顺序
      if (field === sortField) {
        onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        // 切换到新字段时，默认降序
        onSortChange(field, 'desc');
      }
    }
  }, [sortField, sortOrder, onSortChange]);

  const sortOptions: Array<{ field: SortField; label: string; icon: React.ReactNode }> = [
    { field: 'createdAt', label: '时间', icon: <Clock className="w-3 h-3" /> },
    { field: 'name', label: '名称', icon: <Hash className="w-3 h-3" /> },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 搜索框 */}
      <div className={`
        relative flex items-center
        bg-black/20 border rounded-lg transition-all
        ${isFocused ? 'border-brand-500/50 ring-2 ring-brand-500/20' : 'border-white/10'}
      `}>
        <Search className="w-4 h-4 text-slate-500 ml-3 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-2 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
        />
        {searchQuery && (
          <button
            onClick={handleClear}
            className="p-1.5 mr-1 text-slate-500 hover:text-white transition-colors rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 排序选项 */}
      {showSort && onSortChange && (
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-1">排序:</span>
          {sortOptions.map(({ field, label, icon }) => (
            <button
              key={field}
              onClick={() => handleSortFieldChange(field)}
              className={`
                flex items-center gap-1 px-2 py-1 text-[10px] rounded transition-colors
                ${sortField === field
                  ? 'bg-brand-500/20 text-brand-400'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }
              `}
            >
              {icon}
              {label}
              {sortField === field && (
                sortOrder === 'asc'
                  ? <SortAsc className="w-3 h-3" />
                  : <SortDesc className="w-3 h-3" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * 应用搜索和排序 Hook
 */
export const useAppSearch = <T extends { name: string; id?: string; webappId?: string; createdAt?: number }>(
  items: T[]
) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSortChange = useCallback((field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
  }, []);

  const filteredAndSortedItems = useMemo(() => {
    let result = [...items];

    // 搜索过滤
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => {
        const name = item.name?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        const webappId = item.webappId?.toLowerCase() || '';
        return name.includes(query) || id.includes(query) || webappId.includes(query);
      });
    }

    // 排序
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'createdAt':
          comparison = (a.createdAt || 0) - (b.createdAt || 0);
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchQuery, sortField, sortOrder]);

  return {
    searchQuery,
    setSearchQuery,
    sortField,
    sortOrder,
    handleSortChange,
    filteredItems: filteredAndSortedItems,
    hasFilter: searchQuery.trim().length > 0,
    resultCount: filteredAndSortedItems.length,
    totalCount: items.length,
  };
};

export default AppSearch;
