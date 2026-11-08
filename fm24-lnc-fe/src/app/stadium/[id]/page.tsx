'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchStadiumInfo,
  deleteRecord,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  StadiumIcon,
  NationIcon,
  CityIcon,
  ClubIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function StadiumDetailContent() {
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

  const stadiumId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [stadiumInfo, setStadiumInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!stadiumId) return;
    setLoading(true);
    try {
      const data = await fetchStadiumInfo(stadiumId, refreshSignal > 0);
      setStadiumInfo(data);

      const title = data.name || `Stadium ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Stadiums', href: '/list-stadiums' },
        { title },
      ]);
      setBackHref('/list-stadiums');

      const nationId = data.nation_id || data.nation?.id;
      if (nationId) {
        const logoUrl = getNationLogoUrl(nationId);
        if (logoUrl) {
          setHeaderLogo({
            url: logoUrl,
            alt: data.nation_name || title,
            isFlag: true,
          });
        }
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load stadium info');
    } finally {
      setLoading(false);
    }
  }, [stadiumId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (stadiumInfo) {
      openRecordModal(RecordType.STADIUM, stadiumInfo);
    }
  };

  const handleDelete = async () => {
    if (!stadiumInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.STADIUM, String(stadiumInfo.id));
      message.success('Stadium deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-stadiums');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete stadium');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading stadium..." />
      </div>
    );
  }

  if (!stadiumInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Stadium not found.</p>
        <Button onClick={() => router.push('/list-stadiums')} className="mt-4">
          Back to Stadiums
        </Button>
      </div>
    );
  }

  const nationId = stadiumInfo.nation_id || stadiumInfo.nation?.id;
  const nationName = stadiumInfo.nation_name || stadiumInfo.nation?.name_lg || stadiumInfo.nation?.name;
  const cityId = stadiumInfo.city_id || stadiumInfo.city?.id;
  const cityName = stadiumInfo.city_name || stadiumInfo.city?.name_lg || stadiumInfo.city?.name;
  const stadiumName = stadiumInfo.name || `Stadium ${stadiumInfo.id}`;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100/70 p-3 sm:p-4 lg:p-5 space-y-4">
      {/* 1. Title của Body */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <DetailBodyHeader
          onBack={() => router.push('/list-stadiums')}
          id={stadiumInfo.id}
          name={stadiumName}
          icon={<StadiumIcon size={22} className="text-emerald-600" />}
          badgeTypeStyles="bg-emerald-50 border-emerald-200 text-emerald-700"
          extraTag={
            stadiumInfo.capacity ? (
              <Tag color="green" className="m-0 text-xs font-semibold">
                Capacity: {Number(stadiumInfo.capacity).toLocaleString()}
              </Tag>
            ) : undefined
          }
          onEdit={handleEdit}
          onDelete={() => setDeleteModalOpen(true)}
        />
      </div>

      {/* 2. Layout 2 cột theo Wireframe: Trái là Vùng thông tin, Phải là ??? (tạm thời để trống, đóng khung) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Vùng thông tin (bên trái) */}
        <div className="lg:col-span-5 xl:col-span-4 min-w-0 space-y-4">
          <RecordDetailView
            data={stadiumInfo}
            type={EntityType.STADIUM}
            showHeader={false}
            onEdit={handleEdit}
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
        title="Delete stadium"
        itemName={stadiumName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function StadiumDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading stadium...</div>}
    >
      <StadiumDetailContent />
    </Suspense>
  );
}
