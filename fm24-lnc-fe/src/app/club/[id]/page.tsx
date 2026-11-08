'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, message, Select, Spin } from 'antd';
import {
  fetchClubInfo,
  deleteRecord,
  getNationLogoUrl,
  getClubLogoUrl,
} from '../../../services/api';
import DetailBodyHeader from '../../../components/DetailBodyHeader';
import ChildEntitiesSection from '../../../components/ChildEntitiesSection';
import DeleteConfirmModal from '../../../components/DeleteConfirmModal';
import RecordDetailView from '../../../components/RecordDetailView';
import TabIconBadge from '../../../components/TabIconBadge';
import {
  ClubIcon,
  DomesticCompIcon,
  NationIcon,
  StadiumIcon,
  CityIcon,
} from '../../../components/EntityIcons';
import { EntityType, RecordType } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { buildEntityBreadcrumbs } from '../../../utils/breadcrumbs';

function getTeamTypeCode(team: any, isRoot: boolean): string {
  if (isRoot) return '1T';

  const rawType = String(
    team.affiliate_club_type ||
    team.affiliate?.type ||
    ''
  ).toUpperCase().trim();

  if (rawType) return rawType;

  const nameLower = (
    String(team.name_sh || '') + ' ' +
    String(team.name_lg || '') + ' ' +
    String(team.name || '')
  ).toLowerCase();

  // 1. Youth / Academy: U18, U19, U20, U21, U23, BAC, 2AC, 3AC, CAC, AKA
  if (nameLower.includes('u19') || nameLower.includes('u-19')) return 'U19';
  if (nameLower.includes('u21') || nameLower.includes('u-21')) return 'U21';
  if (nameLower.includes('u18') || nameLower.includes('u-18')) return 'U18';
  if (nameLower.includes('u20') || nameLower.includes('u-20')) return 'U20';
  if (nameLower.includes('u23') || nameLower.includes('u-23')) return 'U23';
  if (nameLower.includes('akademie') || nameLower.includes('academy')) return 'AKA';
  if (nameLower.includes('juvenil') || nameLower.includes('junioren')) return 'YTH';

  // 2. B-Team / 2nd Team / Reserves: 2T, BT, RES
  if (
    nameLower.includes('castilla') ||
    nameLower.includes('atlètic') ||
    nameLower.includes(' b ') ||
    nameLower.endsWith(' b') ||
    nameLower.includes(' ii')
  ) {
    return 'BT';
  }

  // 3. C-Team / 3rd Team: 3T, CT
  if (
    nameLower.includes(' c ') ||
    nameLower.endsWith(' c') ||
    nameLower.includes(' iii')
  ) {
    return 'CT';
  }

  if (nameLower.includes('reserves') || nameLower.includes('dự bị')) return 'RES';

  // 4. Fallback for other affiliate
  return 'AFF';
}

function ClubDetailContent() {
  const params = useParams();
  const router = useRouter();
  const {
    setHeaderTitle,
    setHeaderId,
    setBreadcrumbs,
    setBackHref,
    setHeaderLogo,
    refreshSignal,
    triggerRefresh,
  } = useApp();

  const clubId = params?.id ? decodeURIComponent(String(params.id)) : '';

  const [club, setClub] = useState<any | null>(null);
  const [familyTeams, setFamilyTeams] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>(clubId);
  const [loading, setLoading] = useState(true);
  const [logoLoadError, setLogoLoadError] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    if (!clubId) return;
    setLoading(true);
    try {
      const data = await fetchClubInfo(clubId, refreshSignal > 0);
      setClub(data);

      const teams =
        data.familyTeams && data.familyTeams.length > 0
          ? data.familyTeams
          : (data as any).family_teams && (data as any).family_teams.length > 0
          ? (data as any).family_teams
          : [data];
      setFamilyTeams(teams);

      const targetId = activeTab || clubId;
      const found = teams.find((t: any) => String(t.id) === String(targetId));
      if (!found && teams.length > 0) {
        setActiveTab(String(teams[0].id));
      }

      const activeRecord = found || data;
      const title =
        activeRecord.name_sh ||
        activeRecord.name_lg ||
        activeRecord.name ||
        `Club ${activeRecord.id}`;
      setHeaderTitle(title);
      setHeaderId(activeRecord.id);
      setBackHref('/list-clubs');

      const nationId = activeRecord.nation?.id || activeRecord.nation_id;
      const bcs = buildEntityBreadcrumbs({
        nationId,
        nationCode: activeRecord.nation?.name_3l,
        entityTitle: title,
      });
      setBreadcrumbs(bcs);
      const nationLogo = nationId ? getNationLogoUrl(nationId) : null;
      if (nationLogo) {
        setHeaderLogo({
          url: nationLogo,
          alt: activeRecord.nation?.name_lg || 'Nation Flag',
          isFlag: true,
        });
      }
    } catch (err: any) {
      message.error(err.message || 'Failed to load club info');
    } finally {
      setLoading(false);
    }
  }, [clubId, refreshSignal, activeTab, setHeaderTitle, setHeaderId, setBackHref, setBreadcrumbs, setHeaderLogo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const currentClub = useMemo(() => {
    if (!familyTeams.length) return club;
    return (
      familyTeams.find((t) => String(t.id) === String(activeTab)) ||
      club ||
      familyTeams[0]
    );
  }, [familyTeams, activeTab, club]);

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setLogoLoadError(false);
    const selected = familyTeams.find((t) => String(t.id) === String(key));
    if (selected) {
      const title =
        selected.name_sh ||
        selected.name_lg ||
        selected.name ||
        `Club ${selected.id}`;
      setHeaderTitle(title);
      setHeaderId(selected.id);

      const nId = selected.nation?.id || selected.nation_id;
      const bcs = buildEntityBreadcrumbs({
        nationId: nId,
        nationCode: selected.nation?.name_3l,
        entityTitle: title,
      });
      setBreadcrumbs(bcs);
    }
  };

  const handleDeleteClub = async () => {
    if (!currentClub) return;
    setIsDeleting(true);
    try {
      await deleteRecord(RecordType.CLUB, String(currentClub.id));
      message.success('Club deleted successfully');
      setDeleteModalOpen(false);
      triggerRefresh();
      router.push('/list-clubs');
    } catch (err: any) {
      message.error(err.message || 'Failed to delete club');
    } finally {
      setIsDeleting(false);
    }
  };

  const hasAffiliates = familyTeams.length > 1;

  const currentClubTitle =
    currentClub?.name_sh ||
    currentClub?.name_lg ||
    currentClub?.name ||
    `Club ${currentClub?.id || clubId}`;

  const currentNationId = currentClub?.nation?.id || currentClub?.nation_id;

  const tabItems = useMemo(() => {
    if (!hasAffiliates) return [];

    const rootId = String(
      (club as any)?.rootClubId ||
        club?.affiliate?.id ||
        (club as any)?.affiliate_club_id ||
        familyTeams.find((t: any) => !t.affiliate && !t.affiliate_club_id)?.id ||
        club?.id
    );
    return familyTeams.map((team: any) => {
      const tId = String(team.id);
      const isRoot = tId === rootId;
      const isCurrentActive = tId === String(activeTab);
      const teamFullName = team.name_lg || team.name_sh || team.name || `Club ${tId}`;
      const teamDisplayName =
        team.name_sh?.trim() ||
        team.name_lg?.trim() ||
        team.name_6l?.trim() ||
        team.name_3l?.trim() ||
        String(team.id);
      const typeCode = getTeamTypeCode(team, isRoot);

      return {
        value: tId,
        selectedLabel: (
          <div className="flex items-center gap-2 min-w-0">
            <span className="shrink-0 rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase leading-none text-sky-700">
              {typeCode}
            </span>
            <span className="font-semibold truncate">{teamDisplayName}</span>
          </div>
        ),
        label: (
          <div className="flex items-center gap-1.5" title={teamFullName}>
            <TabIconBadge
              icon={
                <ClubIcon
                  size={14}
                  className={isCurrentActive ? 'text-white' : 'text-blue-600'}
                />
              }
              isActive={isCurrentActive}
              className="!h-8 !w-8 !min-w-8 !max-w-8 !p-0 shrink-0 rounded-lg"
            />
            <span className={isCurrentActive ? 'font-bold' : ''}>{teamDisplayName}</span>
            {team.is_extinct && (
              <span className="text-[10px] px-1 rounded font-semibold bg-red-100 text-red-700">
                EXT
              </span>
            )}
          </div>
        ),
      };
    });
  }, [hasAffiliates, familyTeams, activeTab, club]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" tip="Loading club..." />
      </div>
    );
  }

  if (!currentClub) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Club not found.</p>
        <Button onClick={() => router.push('/list-clubs')} className="mt-4">
          Back to Clubs
        </Button>
      </div>
    );
  }

  const clubLogoUrl = !logoLoadError ? getClubLogoUrl(currentClub.id) : null;

  return (
    <div className="w-full h-full overflow-y-auto bg-slate-100/70 p-3 sm:p-4 lg:p-5 space-y-4">
      {/* 1. Title của Body */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <DetailBodyHeader
          onBack={() => router.push('/list-clubs')}
          id={currentClub.id}
          name={currentClubTitle}
          code3={currentClub.name_3l || currentClub.code}
          logoUrl={clubLogoUrl}
          icon={<ClubIcon size={22} className="text-blue-600" />}
          badgeTypeStyles="bg-blue-50 border-blue-200 text-blue-700"
          onDelete={() => setDeleteModalOpen(true)}
        />
      </div>

      {/* 2. Layout 2 cột theo Wireframe: Trái là Vùng thông tin, Phải là ??? (tạm thời để trống, đóng khung) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
        {/* Vùng thông tin (bên trái) */}
        <div className="lg:col-span-3 min-w-0 space-y-4">
          {/* Selector nếu có nhiều đội trong gia đình */}
          {hasAffiliates && (
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="text-xs font-semibold text-slate-500 mb-1.5">
                Select a team in the club family:
              </div>
              <Select
                value={activeTab}
                onChange={handleTabChange}
                options={tabItems}
                optionLabelProp="selectedLabel"
                className="family-team-select w-full"
                popupClassName="family-team-select-dropdown"
                popupMatchSelectWidth
              />
            </div>
          )}

          <RecordDetailView
            data={currentClub}
            type={EntityType.CLUB}
            section="identity"
            inlineEdit
            hideClubAffiliates
            onSaved={loadData}
            onNavigateConfed={() => router.push('/list-nations')}
            onNavigateNation={(nId) => router.push(`/nation/${nId}`)}
            onNavigateComp={(cId) =>
              router.push(`/comp/${cId}${currentNationId ? `?nationId=${currentNationId}` : ''}`)
            }
            onNavigateClub={(cId) => {
              const inFamily = familyTeams.some((t) => String(t.id) === String(cId));
              if (inFamily) {
                handleTabChange(String(cId));
              } else {
                router.push(`/club/${cId}`);
              }
            }}
          />
        </div>

        {/* Khung bên phải để trống hoàn toàn */}
        <div className="lg:col-span-9 min-w-0">
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs min-h-[500px]" />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteClub}
        loading={isDeleting}
        title="Delete club"
        itemName={currentClubTitle}
      />
    </div>
  );
}

export default function ClubDetailPage() {
  return (
    <Suspense
      fallback={<div className="p-8 text-center text-gray-400">Loading club...</div>}
    >
      <ClubDetailContent />
    </Suspense>
  );
}
