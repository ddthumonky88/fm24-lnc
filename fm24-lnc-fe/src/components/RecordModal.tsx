'use client';

import React from 'react';
import RecordDetailModal from './RecordDetailModal';
import { RecordType, EntityType } from '../types';

export interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  type: RecordType | EntityType | string;
  initialData?: any;
  defaultNationId?: string | number;
  defaultCompId?: string | number;
  defaultParentId?: string | number;
}

/**
 * Unified RecordModal:
 * Now powered by RecordDetailModal so that detail view, edit mode, and create mode
 * all live seamlessly inside one consistent, responsive modal.
 */
export default function RecordModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  initialData,
  defaultNationId,
  defaultCompId,
  defaultParentId,
}: RecordModalProps) {
  return (
    <RecordDetailModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      data={initialData}
      type={type}
      initialMode={initialData ? 'edit' : 'create'}
      defaultNationId={defaultNationId}
      defaultCompId={defaultCompId}
      defaultParentId={defaultParentId}
    />
  );
}
