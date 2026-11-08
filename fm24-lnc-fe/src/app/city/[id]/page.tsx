'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchCityInfo,
  deleteRecord,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  CityIcon,
  NationIcon,
  StadiumIcon,
  ClubIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function CityDetailContent() {
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

  const cityId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [cityInfo, setCityInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!cityId) return;
    setLoading(true);
    try {
      const data = await fetchCityInfo(cityId, refreshSignal > 0);
      setCityInfo(data);

      const title = data.name_lg || data.name || `City ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Cities', href: '/list-cities' },
        { title },
      ]);
      setBackHref('/list-cities');

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
      message.error(err.message || 'Failed to load city info');
    } finally {
      setLoading(false);
    }
  }, [cityId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (cityInfo) {
      openRecordModal(RecordType.CITY, cityInfo);
    }
  };

  const handleDelete = async () => {
    if (!cityInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CITY, String(cityInfo.id));
      message.success('City deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-cities');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete city');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading city..." />
      </div>
    );
  }

  if (!cityInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>City not found.</p>
        <Button onClick={() => router.push('/list-cities')} className="mt-4">
          Back to Cities
        </Button>
      </div>
    );
  }

  const nationId = cityInfo.nation_id || cityInfo.nation?.id;
  const nationName = cityInfo.nation_name || cityInfo.nation?.name_lg || cityInfo.nation?.name;
  const cityName = cityInfo.name_lg || cityInfo.name || `City ${cityInfo.id}`;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100/70 p-3 sm:p-4 lg:p-5 space-y-4">
      {/* 1. Title của Body */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <DetailBodyHeader
          onBack={() => router.push('/list-cities')}
          id={cityInfo.id}
          name={cityName}
          icon={<CityIcon size={22} className="text-sky-600" />}
          badgeTypeStyles="bg-sky-50 border-sky-200 text-sky-700"
          extraTag={
            cityInfo.region_code ? (
              <Tag color="cyan" className="m-0 text-xs font-semibold">
                [{cityInfo.region_code}] {cityInfo.region_name || ''}
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
            data={cityInfo}
            type={EntityType.CITY}
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
        title="Delete city"
        itemName={cityName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function CityDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading city...</div>}
    >
      <CityDetailContent />
    </Suspense>
  );
}
