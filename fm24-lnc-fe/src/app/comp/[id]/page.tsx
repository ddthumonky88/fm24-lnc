'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Tag, App, Spin } from 'antd';
import {
  fetchCompetitionInfo,
  deleteRecord,
  getConfederationLogoUrl,
  getNationLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import RecordDetailView from '../../../components/RecordDetailView';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import {
  DomesticCompIcon,
  IntCompIcon,
  ClubIcon,
  AwardIcon,
  NationIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';

function CompetitionDetailContent() {
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

  const compId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [compInfo, setCompInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!compId) return;
    setLoading(true);
    try {
      const data = await fetchCompetitionInfo(compId, refreshSignal > 0);
      setCompInfo(data);

      const title = data.name_lg || data.name || data.name_sh || `Competition ${data.id}`;
      setHeaderTitle(title);
      setHeaderId(data.id);
      setBreadcrumbs([
        { title: 'Competitions', href: '/list-comps' },
        { title: data.name_3l ? `[${data.name_3l}] ${title}` : title },
      ]);
      setBackHref('/list-comps');

      const confedCode = data.confed || (data.nation?.confed as any);
      const confedLogo = confedCode
        ? getConfederationLogoUrl(
            typeof confedCode === 'string' ? confedCode : confedCode?.id || confedCode?.name
          )
        : null;
      if (confedLogo) {
        setHeaderLogo({
          url: confedLogo,
          alt: title,
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load competition info');
    } finally {
      setLoading(false);
    }
  }, [compId, refreshSignal, setHeaderTitle, setHeaderId, setBreadcrumbs, setBackHref, setHeaderLogo, message]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleEdit = () => {
    if (compInfo) {
      openRecordModal(RecordType.COMPETITION, compInfo);
    }
  };

  const handleDelete = async () => {
    if (!compInfo) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.COMPETITION, String(compInfo.id));
      message.success('Competition deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-comps');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete competition');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading competition..." />
      </div>
    );
  }

  if (!compInfo) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Competition not found.</p>
        <Button onClick={() => router.push('/list-comps')} className="mt-4">
          Back to Competitions
        </Button>
      </div>
    );
  }

  const nationId = compInfo.nation?.id || compInfo.nation_id;
  const nationName = compInfo.nation?.name_lg || compInfo.nation?.name || compInfo.nation?.name_sh;
  const isInternational = Boolean(compInfo.is_international || !nationId);
  const compName =
    compInfo.name_lg || compInfo.name || compInfo.name_sh || `Competition ${compInfo.id}`;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100/70 p-3 sm:p-4 lg:p-5 space-y-4">
      {/* 1. Title của Body */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <DetailBodyHeader
          onBack={() => router.push('/list-comps')}
          id={compInfo.id}
          name={compName}
          code3={compInfo.name_3l}
          icon={
            isInternational ? (
              <IntCompIcon size={22} className="text-purple-600" />
            ) : (
              <DomesticCompIcon size={22} className="text-amber-600" />
            )
          }
          badgeTypeStyles={
            isInternational
              ? 'bg-purple-50 border-purple-200 text-purple-700'
              : 'bg-amber-50 border-amber-200 text-amber-700'
          }
          extraTag={
            <Tag color={isInternational ? 'purple' : 'gold'} className="m-0 text-xs font-semibold">
              {isInternational ? '🌍 International' : '🏆 Domestic'}
            </Tag>
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
            data={compInfo}
            type={EntityType.COMPETITION}
            showHeader={false}
            onEdit={handleEdit}
            onNavigateConfed={() => router.push('/list-comps')}
            onNavigateNation={(nId) => router.push(`/nation/${nId}`)}
            onNavigateParentComp={(pId) => router.push(`/comp/${pId}`)}
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
        title="Delete competition"
        itemName={compName}
        loading={isDeleting}
      />
    </div>
  );
}

export default function CompetitionDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-slate-400">Loading competition...</div>}
    >
      <CompetitionDetailContent />
    </Suspense>
  );
}
