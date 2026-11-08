'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Input,
  Table,
  Tag,
  Popconfirm,
  message,
  Pagination,
  type TableColumnsType,
  Space,
  Tooltip,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { fetchPlayers, deleteRecord, PlayerItem } from '../../services/api';
import { useApp } from '../../context/AppContext';
import useResponsivePageSize from '../../hooks/useResponsivePageSize';
import { RecordType } from '../../types';
import AppPagination from '../../components/AppPagination';

export default function PlayersPage() {
  const { openRecordModal, refreshSignal, setHeaderTitle, setHeaderId } = useApp();

  const [players, setPlayers] = useState<PlayerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize, pageSizeReady] = useResponsivePageSize(setPage);
  const [total, setTotal] = useState(0);
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(filterText);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [filterText]);

  const loadPlayers = useCallback(async () => {
    if (!pageSizeReady) return;
    setLoading(true);
    try {
      const data = await fetchPlayers({
        page: page - 1,
        size: pageSize,
        sort: `${sortField},${sortOrder}`,
        keyword: debouncedKeyword.trim() || undefined,
      });
      setPlayers(data);
      const totalCount = (data as any).totalElements ?? (data as any).total ?? data.length;
      setTotal(totalCount);
    } catch (err: any) {
      console.error(err);
      message.error(err.message || 'Failed to load persons');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, pageSizeReady, sortField, sortOrder, debouncedKeyword]);

  useEffect(() => {
    setHeaderTitle('Person');
    setHeaderId(undefined);
  }, [setHeaderTitle, setHeaderId]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers, refreshSignal]);

  const handleDelete = async (id: string) => {
    try {
      await deleteRecord(RecordType.PLAYER, id);
      message.success('Person deleted');
      loadPlayers();
    } catch (e: any) {
      message.error(e.message || 'Delete failed');
    }
  };

  const handleTableChange = (pagination: any, _filters: any, sorter: any) => {
    if (pagination.current && pagination.current !== page) {
      setPage(pagination.current);
    }
    if (pagination.pageSize && pagination.pageSize !== pageSize) {
      setPageSize(pagination.pageSize);
      setPage(1);
    }
    const singleSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    if (singleSorter && singleSorter.field && singleSorter.order) {
      setSortField(String(singleSorter.field));
      setSortOrder(singleSorter.order === 'descend' ? 'desc' : 'asc');
    }
  };

  const columns: TableColumnsType<PlayerItem> = useMemo(
    () => [
      {
        title: 'ID',
        dataIndex: 'id',
        key: 'id',
        width: 150,
        align: 'left',
        sorter: true,
        sortOrder: sortField === 'id' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        render: (id: string) => (
          <Tag color="blue" className="font-mono font-semibold m-0 text-xs">
            {id}
          </Tag>
        ),
      },
      {
        title: 'First Name',
        dataIndex: 'first_name',
        key: 'first_name',
        sorter: true,
        sortOrder: sortField === 'first_name' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        render: (text: string) => <span className="font-medium text-slate-800">{text || '-'}</span>,
      },
      {
        title: 'Second Name',
        dataIndex: 'second_name',
        key: 'second_name',
        sorter: true,
        sortOrder:
          sortField === 'second_name' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        render: (text: string) => (
          <span className="font-semibold text-slate-900">{text || '-'}</span>
        ),
      },
      {
        title: 'Common Name',
        dataIndex: 'common_name',
        key: 'common_name',
        sorter: true,
        sortOrder:
          sortField === 'common_name' ? (sortOrder === 'asc' ? 'ascend' : 'descend') : null,
        render: (text: string) => <span className="text-slate-700">{text || '-'}</span>,
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 150,
        align: 'center',
        render: (_: any, record: PlayerItem) => (
          <Space size="small">
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined className="text-blue-600 hover:text-blue-700" />}
                onClick={() => openRecordModal(RecordType.PLAYER, record)}
              />
            </Tooltip>
            <Popconfirm
              title="Delete person"
              description="Are you sure you want to delete this record?"
              onConfirm={() => handleDelete(record.id)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined className="text-red-500 hover:text-red-600" />}
                />
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openRecordModal, sortField, sortOrder],
  );

  return (
    <div className="h-full w-full flex flex-col bg-slate-100/70 p-3 sm:p-4 gap-3 overflow-hidden">
      {/* Top Header & Search Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs shrink-0 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center text-sm shadow-2xs">
            <UserOutlined />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-800">Person</span>
              <Tag color="purple" className="m-0 font-bold text-xs">
                {total.toLocaleString()} records
              </Tag>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1 sm:flex-initial justify-end">
          <Input
            prefix={<SearchOutlined className="text-slate-400 mr-1" />}
            placeholder="Search person by name, ID..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            allowClear
            className="w-full sm:w-72 bg-slate-50 hover:bg-white focus:bg-white rounded-xl border border-slate-200 py-1.5 px-3 shadow-2xs"
          />

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openRecordModal(RecordType.PLAYER)}
            className="bg-blue-600 hover:bg-blue-700 font-medium rounded-xl h-9 shadow-2xs shrink-0"
          >
            <span className="hidden sm:inline">Add Person</span>
          </Button>
        </div>
      </div>

      {/* Main List Card Container */}
      <div className="flex-1 min-h-0 bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden flex flex-col">
        {/* Scrollable Cards Area */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {players.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-xs italic">
                No person records found
              </div>
            ) : (
              players.map((p) => (
                <div
                  key={p.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs flex flex-col justify-between gap-2 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                    <Tag color="blue" className="font-mono font-bold text-[10px] m-0">
                      {p.id}
                    </Tag>
                    <div className="flex items-center gap-1">
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={<EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
                        onClick={() => openRecordModal(RecordType.PLAYER, p)}
                      />
                      <Popconfirm
                        title="Delete Record"
                        description={`Delete ${p.first_name} ${p.second_name}?`}
                        onConfirm={() => handleDelete(String(p.id))}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Button
                          type="text"
                          shape="circle"
                          size="small"
                          danger
                          icon={<DeleteOutlined style={{ fontSize: 13 }} />}
                        />
                      </Popconfirm>
                    </div>
                  </div>

                  <div className="text-[12px] space-y-1">
                    <div className="flex items-baseline gap-1.5">
                      <span className="w-16 text-slate-400 font-normal select-none shrink-0 uppercase text-[10px]">
                        F-NAME:
                      </span>
                      <span className="font-bold text-[12px] text-gray-800">
                        {p.first_name || '-'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="w-16 text-slate-400 font-normal select-none shrink-0 uppercase text-[10px]">
                        S-NAME:
                      </span>
                      <span className="font-bold text-[12px] text-gray-800">
                        {p.second_name || '-'}
                      </span>
                    </div>
                    {p.common_name && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="w-16 text-slate-400 font-normal select-none shrink-0 uppercase text-[10px]">
                          C-NAME:
                        </span>
                        <span className="font-bold text-[12px] text-gray-700 italic">
                          {p.common_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pinned Bottom Pagination */}
        {total > 0 && (
          <div className="shrink-0 flex flex-col sm:flex-row items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 border-t border-slate-100 bg-white gap-1.5 sm:gap-3">
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left shrink-0">
              Showing <strong className="text-slate-700">{Math.min((page - 1) * pageSize + 1, total)}</strong> - <strong className="text-slate-700">{Math.min(page * pageSize, total)}</strong> / <strong className="text-blue-600">{total.toLocaleString()}</strong> players
            </div>
            <div className="flex items-center justify-center sm:justify-end max-w-full overflow-x-auto">
              <AppPagination
                current={page}
                pageSize={pageSize}
                total={total}
                showSizeChanger={true}
                pageSizeOptions={[10, 24, 60]}
                onChange={(p, s) => {
                  setPage(p);
                  if (s && s !== pageSize) {
                    setPageSize(s);
                    setPage(1);
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
