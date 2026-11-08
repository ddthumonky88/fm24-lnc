'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Tabs, Input, Button, message, Spin } from 'antd';
import {
  SettingOutlined,
  FolderOpenOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  FileTextOutlined,
  PictureOutlined,
  GlobalOutlined,
  TrophyOutlined,
  BankOutlined,
  CompassOutlined,
  SaveOutlined,
  CloudUploadOutlined,
} from '@ant-design/icons';
import {
  fetchAppConfig,
  updateAppConfig,
  testDirectoryPath,
  syncLncFromConfig,
  reloadLogosFromConfig,
  syncLocalLncToProd,
  type AppPathsConfig,
  type ConfigStatusResponse,
} from '../services/api';

const DEFAULT_LOCAL_LNC_DIR =
  'D:\\Games\\FM24_2026\\FootballManager24\\data\\database\\db\\2430\\lnc\\all';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  onRefreshData?: () => void;
}

export default function SettingsModal({ open, onClose, onRefreshData }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingToProd, setSyncingToProd] = useState(false);
  const [reloadingLogos, setReloadingLogos] = useState(false);

  const [formData, setFormData] = useState<AppPathsConfig>({
    lncDir: '',
    confedLogoDir: '',
    nationLogoDir: '',
    compLogoDir: '',
    clubLogoDir: '',
  });

  const [statusData, setStatusData] = useState<ConfigStatusResponse['status'] | null>(null);

  const loadCurrentConfig = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAppConfig();
      setFormData(data.config);
      setStatusData(data.status);
    } catch (err: any) {
      message.error(err.message || 'Không thể kết nối tới backend local để tải cấu hình');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadCurrentConfig();
    }
  }, [open, loadCurrentConfig]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateAppConfig(formData);
      setFormData(updated.config);
      setStatusData(updated.status);
      message.success('Đã lưu cấu hình thư mục thành công!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      message.error(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncLnc = async () => {
    if (!confirm('Bạn có chắc chắn muốn đồng bộ lại database từ thư mục file .LNC local này?')) {
      return;
    }
    setSyncing(true);
    const hide = message.loading('Đang phân tích và nhập dữ liệu từ file .LNC...', 0);
    try {
      await handleSave();
      await syncLncFromConfig();
      hide();
      message.success('Đồng bộ database thành công!');
      if (onRefreshData) onRefreshData();
      await loadCurrentConfig();
    } catch (err: any) {
      hide();
      message.error(err.message || 'Đồng bộ thất bại');
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncToProd = async () => {
    if (
      !confirm(
        'Bạn có chắc muốn đẩy toàn bộ nội dung từ các file .LNC local lên Cloud Database (Render)?',
      )
    ) {
      return;
    }
    setSyncingToProd(true);
    const hide = message.loading('Đang đọc file .LNC local và gửi lên Cloud Database...', 0);
    try {
      await handleSave();
      const res = await syncLocalLncToProd();
      hide();
      message.success(res.message || 'Đã đồng bộ lên Cloud Database Production thành công!');
      if (onRefreshData) onRefreshData();
    } catch (err: any) {
      hide();
      message.error(err.message || 'Đồng bộ lên Cloud thất bại');
    } finally {
      setSyncingToProd(false);
    }
  };

  const handleReloadLogos = async () => {
    setReloadingLogos(true);
    try {
      await handleSave();
      await reloadLogosFromConfig();
      message.success('Đã quét và nạp lại ảnh từ thư mục local thành công!');
      await loadCurrentConfig();
    } catch (err: any) {
      message.error(err.message || 'Không thể tải lại ảnh');
    } finally {
      setReloadingLogos(false);
    }
  };

  const handleTestPath = async (key: keyof AppPathsConfig) => {
    const p = formData[key];
    if (!p) {
      message.warning('Vui lòng nhập đường dẫn để kiểm tra');
      return;
    }
    try {
      const res = await testDirectoryPath(p);
      if (res.exists) {
        if (res.isDirectory) {
          message.success(`Thư mục hợp lệ trên máy! Phát hiện ${res.fileCount} mục bên trong.`);
        } else {
          message.info(`Đường dẫn là một file (kích thước: ${(res.size / 1024).toFixed(1)} KB)`);
        }
      } else {
        message.error('Đường dẫn không tồn tại trên máy!');
      }
    } catch (err: any) {
      message.error(err.message || 'Không thể kiểm tra đường dẫn');
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const lncStatus = statusData?.lnc;

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-slate-800 font-semibold text-base">
          <SettingOutlined className="text-blue-600" />
          <span>Cấu hình thư mục Local</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      getContainer={() => document.getElementById('mobile-frame-root') || document.body}
      width="100%"
      style={{ width: '100%', maxWidth: 'calc(100% - 20px)', margin: '0 auto' }}
      centered
      footer={[
        <Button key="close" onClick={onClose}>
          Đóng
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          onClick={handleSave}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Lưu cấu hình
        </Button>,
      ]}
      destroyOnHidden
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Spin size="large" />
          <span className="text-sm text-slate-500">Đang tải cấu hình từ backend local...</span>
        </div>
      ) : (
        <div className="mt-1">
          <Tabs
            defaultActiveKey="lnc"
            items={[
              {
                key: 'lnc',
                label: (
                  <span className="flex items-center gap-1.5 font-medium text-xs">
                    <FileTextOutlined className="text-blue-500" />
                    <span>File .LNC</span>
                  </span>
                ),
                children: (
                  <div className="space-y-3 py-1">
                    {/* Local LNC Path */}
                    <div>
                      <div className="flex items-center justify-between mb-1 text-xs">
                        <span className="font-semibold text-slate-700">
                          Đường dẫn thư mục .LNC:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setFormData({ ...formData, lncDir: DEFAULT_LOCAL_LNC_DIR })
                            }
                            className="text-[11px] text-blue-600 hover:underline cursor-pointer bg-transparent border-0 p-0"
                          >
                            Mặc định
                          </button>
                          {lncStatus?.exists ? (
                            <span className="text-emerald-600 text-[11px] font-medium flex items-center gap-0.5">
                              <CheckCircleOutlined /> Hợp lệ
                            </span>
                          ) : (
                            <span className="text-rose-500 text-[11px] font-medium flex items-center gap-0.5">
                              <CloseCircleOutlined /> Không tìm thấy
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Input
                          value={formData.lncDir}
                          onChange={(e) => setFormData({ ...formData, lncDir: e.target.value })}
                          placeholder="D:\Games\FM24_2026\FootballManager24\data\database\db\2430\lnc\all"
                          prefix={<FolderOpenOutlined className="text-slate-400" />}
                          className="flex-1 font-mono text-xs"
                          allowClear
                        />
                        <Button
                          onClick={() => handleTestPath('lncDir')}
                          className="shrink-0 text-xs"
                        >
                          Kiểm tra
                        </Button>
                      </div>
                    </div>

                    {/* Server Status Checklist */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/60 font-medium">
                        <span className="text-slate-600">3 file .LNC trong thư mục:</span>
                        {lncStatus?.allFilesFound ? (
                          <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                            <CheckCircleOutlined /> Đầy đủ
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <ExclamationCircleOutlined /> Chưa đủ
                          </span>
                        )}
                      </div>

                      {[
                        {
                          key: 'cityNation',
                          label: lncStatus?.files?.cityNation?.name || 'fm24_geography.lnc',
                          file: lncStatus?.files?.cityNation,
                        },
                        {
                          key: 'clubStadium',
                          label: lncStatus?.files?.clubStadium?.name || 'fm24_club.lnc',
                          file: lncStatus?.files?.clubStadium,
                        },
                        {
                          key: 'compOther',
                          label: lncStatus?.files?.compOther?.name || 'fm24_competition_other.lnc',
                          file: lncStatus?.files?.compOther,
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between text-xs py-0.5"
                        >
                          <span className="flex items-center gap-1.5 text-slate-700 font-mono text-[11.5px] truncate">
                            {item.file?.exists ? (
                              <CheckCircleOutlined className="text-emerald-500 text-xs shrink-0" />
                            ) : (
                              <CloseCircleOutlined className="text-rose-400 text-xs shrink-0" />
                            )}
                            <span className="truncate">{item.label}</span>
                          </span>

                          <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">
                            {item.file?.exists ? (
                              formatFileSize(item.file?.size)
                            ) : (
                              <span className="text-rose-500">Thiếu</span>
                            )}
                          </span>
                        </div>
                      ))}
                      {/* Sync Actions inside status card (2-col grid, never cut off) */}
                      <div className="pt-2 border-t border-slate-200/70 grid grid-cols-2 gap-2">
                        <Button
                          icon={<SyncOutlined spin={syncing} />}
                          loading={syncing}
                          onClick={handleSyncLnc}
                          disabled={!lncStatus?.allFilesFound || syncingToProd}
                          className="text-xs text-emerald-700 border-emerald-300 hover:border-emerald-500 hover:text-emerald-800 bg-white h-8"
                        >
                          Đồng bộ DB Local
                        </Button>
                        <Button
                          icon={<CloudUploadOutlined spin={syncingToProd} />}
                          loading={syncingToProd}
                          onClick={handleSyncToProd}
                          disabled={!lncStatus?.allFilesFound || syncing}
                          className="text-xs text-sky-700 border-sky-300 hover:border-sky-500 hover:text-sky-800 bg-white h-8"
                        >
                          Đẩy lên Cloud Prod
                        </Button>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                key: 'logos',
                label: (
                  <span className="flex items-center gap-1.5 font-medium text-xs">
                    <PictureOutlined className="text-purple-500" />
                    <span>Ảnh & Logo</span>
                  </span>
                ),
                children: (
                  <div className="space-y-2.5 py-1">
                    {[
                      {
                        key: 'confedLogoDir' as const,
                        label: 'Logo Châu lục',
                        icon: <GlobalOutlined className="text-blue-500" />,
                        status: statusData?.confedLogo,
                        placeholder: 'D:\\...\\graphics\\logo\\Confederations\\normal',
                      },
                      {
                        key: 'nationLogoDir' as const,
                        label: 'Logo Quốc gia',
                        icon: <CompassOutlined className="text-emerald-500" />,
                        status: statusData?.nationLogo,
                        placeholder: 'D:\\...\\graphics\\logo\\Nations\\normal',
                      },
                      {
                        key: 'compLogoDir' as const,
                        label: 'Logo Giải đấu (tùy chọn)',
                        icon: <TrophyOutlined className="text-amber-500" />,
                        status: statusData?.compLogo,
                        placeholder: 'D:\\...\\graphics\\logo\\Competitions',
                      },
                      {
                        key: 'clubLogoDir' as const,
                        label: 'Logo CLB (tùy chọn)',
                        icon: <BankOutlined className="text-purple-500" />,
                        status: statusData?.clubLogo,
                        placeholder: 'D:\\...\\graphics\\logo\\Club',
                      },
                    ].map((field) => (
                      <div key={field.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                            {field.icon}
                            <span>{field.label}:</span>
                          </span>
                          {field.status?.exists ? (
                            <span className="text-emerald-600 text-[11px] font-mono">
                              {field.status.fileCount} file
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chưa tìm thấy</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            value={formData[field.key]}
                            onChange={(e) =>
                              setFormData({ ...formData, [field.key]: e.target.value })
                            }
                            placeholder={field.placeholder}
                            className="flex-1 font-mono text-xs"
                            allowClear
                          />
                          <Button
                            onClick={() => handleTestPath(field.key)}
                            size="small"
                            className="text-xs shrink-0"
                          >
                            Kiểm tra
                          </Button>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 flex justify-end border-t border-slate-100">
                      <Button
                        icon={<ReloadOutlined spin={reloadingLogos} />}
                        loading={reloadingLogos}
                        onClick={handleReloadLogos}
                        className="text-xs text-purple-700 border-purple-300 hover:border-purple-500 hover:text-purple-800 bg-white h-8"
                      >
                        Quét & Nạp lại Logo
                      </Button>
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      )}
    </Modal>
  );
}
