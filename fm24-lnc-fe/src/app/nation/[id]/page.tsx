'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, App, Spin } from 'antd';
import {
  fetchNationInfo,
  deleteRecord,
  getNationLogoUrl,
  NationInfoData,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  NationIcon,
  DomesticCompIcon,
  ClubIcon,
  CityIcon,
  StadiumIcon,
  AwardIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

export default function NationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { message } = App.useApp();
  const {
    openRecordModal,
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
    triggerRefresh,
  } = useApp();

  const nationId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [nationInfo, setNationInfo] = useState<NationInfoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!nationId) return;
    setLoading(true);
    try {
      const data = await fetchNationInfo(nationId, refreshSignal > 0);
      setNationInfo(data);

      const title = data.name_lg || data.name_sh || `Nation ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Nations', href: '/list-nations' },
        { title: `[${data.name_3l || ''}] ${title}` },
      ]);
      setBackHref('/list-nations');

      const logoUrl = getNationLogoUrl(data.id);
      if (logoUrl) {
        setHeaderLogo({
          url: logoUrl,
          alt: title,
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load nation info');
    } finally {
      setLoading(false);
    }
  }, [nationId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (nationInfo) {
      openRecordModal(RecordType.COMPETITION, {
        id: nationInfo.id,
        name_lg: nationInfo.name_lg,
        name_sh: nationInfo.name_sh,
        name_3l: nationInfo.name_3l,
        confed: nationInfo.confed,
      });
    }
  };

  const handleDelete = async () => {
    if (!nationInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.COMPETITION, String(nationInfo.id));
      message.success('Nation deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-nations');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete nation');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading nation..." />
      </div>
    );
  }

  if (!nationInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Nation not found.</p>
        <Button onClick={() => router.push('/list-nations')} className="mt-4">
          Back to Nations
        </Button>
      </div>
    );
  }

  const logoUrl = getNationLogoUrl(nationInfo.id);
  const nationName =
    nationInfo.name_lg || nationInfo.name_sh || `Nation ${nationInfo.id}`;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100/70 p-3 sm:p-4 lg:p-5 space-y-4">
      {/* 1. Title của Body */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <DetailBodyHeader
          onBack={() => router.push('/list-nations')}
          id={nationInfo.id}
          name={nationName}
          code3={nationInfo.name_3l}
          logoUrl={logoUrl}
          icon={<NationIcon size={22} className="text-cyan-600" />}
          badgeTypeStyles="bg-cyan-50 border-cyan-200 text-cyan-700"
          onEdit={handleEdit}
          onDelete={() => setDeleteModalOpen(true)}
        />
      </div>

      {/* 2. Layout 2 cột theo Wireframe: Trái là Vùng thông tin, Phải là ??? (tạm thời để trống, đóng khung) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Vùng thông tin (bên trái) */}
        <div className="lg:col-span-5 xl:col-span-4 min-w-0 space-y-4">
          <RecordDetailView
            data={nationInfo}
            type={EntityType.NATION}
            showHeader={false}
            onEdit={handleEdit}
            onNavigateConfed={() => router.push('/list-nations')}
          />
        </div>

        {/* Khung bên phải để trống hoàn toàn */}
        <div className="lg:col-span-7 xl:col-span-8 min-w-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs min-h-[500px]" />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete nation"
        itemName={nationName}
        loading={isDeleting}
      />
    </div>
  );
}
