'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Modal, Button, Tag, Empty, Spin, message, Tooltip } from 'antd';
import { PlusOutlined, ReloadOutlined, CopyOutlined, CheckOutlined, BranchesOutlined } from '@ant-design/icons';
import { fetchSubCompetitions } from '../services/api';
import EntityCard, { formatCategoryCode, getCategoryTagColor } from './EntityCard';
import RecordModal from './RecordModal';
import { DomesticCompIcon } from './EntityIcons';
import { RecordType } from '../types';

export interface SubCompetitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentComp: any | null;
  allCompetitions?: any[];
  onEdit?: (record: any) => void;
  onDelete?: (record: any) => void;
  onNavigate?: (step: any) => void;
  onRefreshParent?: () => void;
}

export default function SubCompetitionsModal({
  isOpen,
  onClose,
  parentComp,
  allCompetitions = [],
  onEdit,
  onDelete,
  onNavigate,
  onRefreshParent,
}: SubCompetitionsModalProps) {
  const router = useRouter();
  const [subComps, setSubComps] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (parentComp?.id !== undefined && parentComp?.id !== null) {
      navigator.clipboard.writeText(String(parentComp.id));
      setCopiedId(true);
      message.success(`Copied ID: ${parentComp.id}`);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // Load sub-competitions
  const loadSubCompetitions = useCallback(
    async (forceRefresh = false) => {
      if (!parentComp?.id) return;

      // Use in-memory matching first if available
      const localChildren = allCompetitions.filter(
        (c) =>
          String(c.parent_comp?.id || c.parent_id || c.parent?.id) ===
          String(parentComp.id),
      );
      if (localChildren.length > 0 && !forceRefresh) {
        setSubComps(localChildren);
      }

      setLoading(true);
      try {
        const fetched = await fetchSubCompetitions(String(parentComp.id), forceRefresh);
        setSubComps(fetched);
      } catch (err: any) {
        console.error('Failed to fetch sub-competitions:', err);
        if (localChildren.length === 0) {
          message.error('Failed to load sub-competitions');
        }
      } finally {
        setLoading(false);
      }
    },
    [parentComp?.id, allCompetitions],
  );

  useEffect(() => {
    if (isOpen && parentComp?.id) {
      loadSubCompetitions(false);
    }
  }, [isOpen, parentComp?.id, loadSubCompetitions]);

  const handleDeleteChild = async (child: any) => {
    if (onDelete) {
      await onDelete(child);
      setSubComps((prev) => prev.filter((c) => String(c.id) !== String(child.id)));
      onRefreshParent?.();
    }
  };

  const handleNavigateChild = (step: any) => {
    onClose();
    if (onNavigate) {
      onNavigate(step);
    } else if (step?.id) {
      router.push(`/comp/${step.id}`);
    }
  };

  const parentShortName =
    parentComp?.name_sh || parentComp?.name_lg || parentComp?.name || `Competition ${parentComp?.id}`;

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2.5 sm:gap-3 pb-2.5 pr-8 min-w-0 border-b border-slate-100">
            <Tooltip title="Sub-Competitions" placement="bottom">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 cursor-default p-0 shadow-2xs border bg-amber-50/90 border-amber-300 text-amber-600">
                <DomesticCompIcon size={18} />
              </div>
            </Tooltip>

            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <div className="flex items-center gap-2 flex-wrap">
                {parentComp?.id !== undefined && parentComp?.id !== null && (
                  <Tooltip title="Click to copy ID" placement="bottom">
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 border border-sky-200 font-mono text-xs font-bold transition-all cursor-pointer shadow-2xs select-none"
                    >
                      <span>{parentComp.id}</span>
                      {copiedId ? (
                        <CheckOutlined className="text-emerald-600 text-xs" />
                      ) : (
                        <CopyOutlined className="text-sky-500 text-xs" />
                      )}
                    </button>
                  </Tooltip>
                )}
              </div>

              <div className="mt-1 min-w-0">
                <div
                  className="font-bold text-xs sm:text-[13px] text-slate-900 uppercase tracking-wide line-clamp-2 break-words block leading-snug"
                  title={parentShortName}
                >
                  <span>{parentShortName}</span>
                </div>
              </div>
            </div>
          </div>
        }
        className="sub-competitions-modal font-sans"
        open={isOpen}
        onCancel={onClose}
        getContainer={() => document.getElementById('mobile-frame-root') || document.body}
        width="100%"
        style={{ width: '100%', maxWidth: 'calc(100% - 20px)', margin: '0 auto' }}
        centered
        destroyOnHidden
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 pt-0.5 w-full">
            <span className="text-gray-600 text-xs">
              Total: <strong className="text-gray-800 font-semibold">{subComps.length}</strong>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap ml-auto">
              <Button size="small" onClick={onClose} className="text-xs">
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="py-2 max-h-[68vh] overflow-y-auto pr-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setIsAddModalOpen(true)}
              style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}
              className="text-xs font-medium"
            ></Button>
          </div>
          {loading && subComps.length === 0 ? (
            <div className="py-20 text-center flex flex-col items-center gap-3 text-gray-500">
              <Spin size="large" />
              <span className="text-xs">Loading sub-competitions...</span>
            </div>
          ) : subComps.length === 0 ? (
            <div className="py-16 bg-gray-50/60 rounded-xl border border-gray-100">
              <Empty description="No sub-competitions found for this parent" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-2">
              {subComps.map((child) => (
                <EntityCard
                  key={child.id}
                  type="competition"
                  data={{
                    ...child,
                    parent_id: child.parent_id || parentComp?.id,
                    parent: child.parent || parentComp,
                    nation: child.nation || parentComp?.nation,
                    nation_id: child.nation_id || parentComp?.nation_id,
                  }}
                  onNavigate={handleNavigateChild}
                  onEdit={onEdit}
                  onDelete={handleDeleteChild}
                />
              ))}
            </div>
          )}
        </div>
      </Modal>

      {isAddModalOpen && (
        <RecordModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            loadSubCompetitions(true);
            onRefreshParent?.();
          }}
          type={RecordType.COMPETITION}
          initialData={{
            parent_id: parentComp?.id ? String(parentComp.id) : undefined,
            nation_id: parentComp?.nation_id ? String(parentComp.nation_id) : undefined,
            confed_id: parentComp?.confed_id ? String(parentComp.confed_id) : undefined,
            categories: parentComp?.categories || undefined,
          }}
          defaultNationId={parentComp?.nation_id ? String(parentComp.nation_id) : undefined}
          defaultParentId={parentComp?.id ? String(parentComp.id) : undefined}
        />
      )}
    </>
  );
}
