import type { BreadcrumbStep } from '../context/AppContext';

interface EntityBreadcrumbOptions {
  nationId?: string | number | null;
  nationCode?: string | number | null;
  entityTitle?: string | number | null;
}

export function buildEntityBreadcrumbs({
  nationId,
  nationCode,
  entityTitle,
}: EntityBreadcrumbOptions): BreadcrumbStep[] {
  const breadcrumbs: BreadcrumbStep[] = [{ title: 'HOME', href: '/home' }];

  if (nationCode) {
    breadcrumbs.push({
      title: String(nationCode),
      ...(entityTitle && nationId ? { href: `/nation/${nationId}` } : {}),
    });
  }

  if (entityTitle) {
    breadcrumbs.push({ title: String(entityTitle) });
  }

  return breadcrumbs;
}
