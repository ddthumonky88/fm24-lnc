import { RecordType } from '../types';

export function getApiBase(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('custom_api_base');
    if (custom) return custom;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return 'http://127.0.0.1:3001/api';
}

export function getLocalApiBase(): string {
  return getApiBase();
}

export function setCustomLocalApiBase(url: string | null) {
  setCustomApiBase(url);
}

export function setCustomApiBase(url: string | null) {
  if (typeof window !== 'undefined') {
    if (url) {
      localStorage.setItem('custom_api_base', url);
    } else {
      localStorage.removeItem('custom_api_base');
    }
    clearApiCache();
  }
}

export interface PaginationQuery {
  page?: number;
  size?: number;
  sort?: string | string[];
  keyword?: string;
}

export interface NationFilterQuery extends PaginationQuery {
  confedId?: string;
}

export interface CompetitionFilterQuery extends PaginationQuery {
  confedId?: string;
  nationId?: string;
  isInternational?: boolean;
  category?: string;
  topLevelOnly?: boolean;
}

export interface IndependentClubFilterQuery extends PaginationQuery {
  extinct?: boolean | string;
}

export interface CityFilterQuery extends PaginationQuery {
  category?: string;
  regionCode?: string;
  regionId?: number | string;
  removeOnly?: boolean;
}

export interface PageData<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
  first: boolean;
  last: boolean;
}

export type PaginatedResponse<T> = PageData<T>;

export type PaginatedList<T> = T[] &
  Partial<Omit<PageData<T>, 'content'>> & {
    content?: T[];
  };

/**
 * Envelope chuẩn mà backend bọc quanh mọi response JSON.
 */
export interface ApiEnvelope<T = unknown> {
  status: number;
  success: boolean;
  message: string;
  data: T | null;
  error: { code: string; message: string; validationErrors: string | null } | null;
  timestamp: number;
  path: string;
  correlationId: string;
}

function isApiEnvelope(body: unknown): body is ApiEnvelope {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  return typeof b.success === 'boolean' && 'data' in b && 'timestamp' in b && 'correlationId' in b;
}

function normalizeEntityFields(item: any): any {
  if (!item || typeof item !== 'object') return item;
  if (Array.isArray(item)) {
    item.forEach(normalizeEntityFields);
    return item;
  }
  if (item.content && Array.isArray(item.content)) {
    item.content.forEach(normalizeEntityFields);
  }

  // IDs prefixed with `n-` represent records newly added outside the base FM database.
  if (/^n-\d+$/i.test(String(item.id ?? ''))) {
    item.type = 'NEW';
  }

  // Stats normalization
  if (item.stats && typeof item.stats === 'object') {
    const s = item.stats;
    if (s.nations !== undefined && item.totalNations === undefined) item.totalNations = s.nations;
    if (s.intComps !== undefined && item.totalIntComps === undefined)
      item.totalIntComps = s.intComps;
    if (s.comps !== undefined && item.totalComps === undefined) item.totalComps = s.comps;
    if (s.clubs !== undefined && item.totalClubs === undefined) item.totalClubs = s.clubs;
    if (s.stadiums !== undefined && item.totalStadiums === undefined)
      item.totalStadiums = s.stadiums;
    if (s.cities !== undefined && item.totalCities === undefined) item.totalCities = s.cities;
    if (s.awards !== undefined && item.totalAwards === undefined) item.totalAwards = s.awards;
    if (s.children !== undefined && item.totalChildren === undefined)
      item.totalChildren = s.children;
  }

  // Name fields normalization
  if (!item.name) {
    item.name = item.name_sh || item.name_lg || undefined;
  }

  // City region / categories
  // if (item.region !== undefined && item.categories === undefined) item.categories = item.region;
  // if (item.categories !== undefined && item.region === undefined) item.region = item.categories;

  // Competition & Stadium type / categories
  // if (item.type !== undefined && item.categories === undefined) item.categories = item.type;
  // if (item.categories !== undefined && item.type === undefined) item.type = item.categories;
  // if (item.type === undefined && item.stadium_type !== undefined) item.type = item.stadium_type;

  // City & Stadium is_disabled
  // if (item.is_disabled !== undefined && item.isDisabled === undefined)
  //   item.isDisabled = item.is_disabled;
  // if (item.isDisabled !== undefined && item.is_disabled === undefined)
  //   item.is_disabled = item.isDisabled;
  // const isClubRecord =
  //   item.name_6l !== undefined ||
  //   item.comp_id !== undefined ||
  //   item.is_extinct !== undefined;
  // if (!isClubRecord && item.is_disabled === undefined && item.inactive_fields !== undefined) {
  //   const list = String(item.inactive_fields)
  //     .split(',')
  //     .map((s: string) => s.trim().toLowerCase());
  //   item.is_disabled = list.includes('name');
  //   item.isDisabled = item.is_disabled;
  // }

  // Confed / nation ID aliases
  if (item.confed_id !== undefined && item.confederation_id === undefined)
    item.confed_id = item.confed_id;
  if (item.confederation_id !== undefined && item.confed_id === undefined)
    item.confed_id = item.confederation_id;
  delete item.confederation_id;

  if (item.nation_id !== undefined && item.country_id === undefined)
    item.country_id = item.nation_id;
  if (item.country_id !== undefined && item.nation_id === undefined)
    item.nation_id = item.country_id;

  // Nested relations
  if (item.confederation && !item.confed) item.confed = item.confederation;
  delete item.confederation;
  if (item.competition && !item.comp) item.comp = item.competition;
  delete item.competition;

  // Club affiliate_club unification
  if (!item.affiliate_club && (item.affiliate_club_id || item.parent_id || item.parent_club)) {
    const affObj = item.parent_club || item.affiliate_club || {};
    item.affiliate_club = {
      id: String(item.affiliate_club_id || item.parent_id || affObj.id),
      name_lg: affObj.name_lg ?? affObj.name ?? null,
      name_sh: affObj.name_sh ?? null,
      name_6l: affObj.name_6l ?? null,
      name_3l: affObj.name_3l ?? null,
      type: item.affiliate_club_type || item.affiliate_type || affObj.type || null,
    };
  }
  delete item.affiliate_club_id;
  delete item.affiliate_club_type;
  delete item.parent_club;
  delete item.affiliate_type;
  if (item.comp_id !== undefined || item.name_6l !== undefined) {
    delete item.parent;
  }

  // City region unification
  if (!item.region && item.region_name) {
    item.region = item.region_name;
  }
  if (item.region_code !== undefined && item.regionCode === undefined) {
    item.regionCode = item.region_code;
  }
  delete item.region_name;
  delete item.region_code;

  // parent_comp mapping
  if (item.parent_comp !== undefined && item.parent === undefined) {
    item.parent = item.parent_comp;
  }

  // is_international inference if missing
  if (item.is_international === undefined && (item.type !== undefined || item.confed !== undefined)) {
    item.is_international = Boolean(!item.nation && !item.nation_id && (item.confed || item.confed_id));
  }

  if (item.nation) normalizeEntityFields(item.nation);
  if (item.comp) normalizeEntityFields(item.comp);
  // if (item.parent) normalizeEntityFields(item.parent);

  return item;
}

/** Bóc `data` ra khỏi envelope (nếu body không phải envelope thì trả nguyên body). */
export function unwrapApiResponse<T>(body: unknown): T {
  const data = isApiEnvelope(body) ? body.data : body;
  return normalizeEntityFields(data) as T;
}

/**
 * Đọc response JSON: ném Error với message từ server (error.message / message) khi lỗi,
 * ngược lại trả về `data` của envelope.
 */
async function parseApiResponse<T = any>(res: Response, fallbackError: string): Promise<T> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }

  const envelope = isApiEnvelope(body) ? body : null;
  if (!res.ok || (envelope && !envelope.success)) {
    const raw =
      envelope?.error?.message ||
      envelope?.message ||
      (body && typeof body === 'object' ? (body as { message?: unknown }).message : undefined);
    const message = Array.isArray(raw) ? raw.join('; ') : raw;
    throw new Error(typeof message === 'string' && message ? message : fallbackError);
  }
  return unwrapApiResponse<T>(body);
}

export interface EntityStats {
  nations?: number;
  intComps?: number;
  comps?: number;
  clubs?: number;
  stadiums?: number;
  cities?: number;
  awards?: number;
  children?: number;
  club?: number;
  award?: number;
}

export interface ConfederationItem {
  id: string;
  name: string;
  totalNations?: number;
  totalIntComps?: number;
  stats?: EntityStats;
}

export interface NationItem {
  id: string;
  name?: string;
  name_lg?: string;
  name_sh?: string;
  name_3l?: string;
  confed?: any;
  confed_id?: string;
  totalChildren?: number;
  totalComps?: number;
  totalClubs?: number;
  totalStadiums?: number;
  totalCities?: number;
  totalAwards?: number;
  stats?: EntityStats;
  inactive_fields?: string | null;
}

export interface CompetitionItem {
  id: string;
  name?: string;
  name_lg?: string;
  name_sh?: string;
  name_3l?: string;
  fg_color?: string;
  bg_color?: string;
  nation?: NationItem;
  nation_id?: string;
  confed?: any;
  confed_id?: string;
  parent?: CompetitionItem | null;
  parent_id?: string;
  type?: string;
  note?: string;
  is_virtual?: boolean;
  virtual_type?: string;
  stats?: EntityStats;
  inactive_fields?: string;
}

export interface AffiliateClubInfo {
  id: string;
  name?: string | null;
  name_lg?: string | null;
  name_sh?: string | null;
  name_6l?: string | null;
  name_3l?: string | null;
  type?: string | null;
}

export interface ClubItem {
  id: string;
  name?: string;
  name_lg?: string;
  name_sh?: string;
  name_6l?: string;
  name_3l?: string;
  nation_id?: string;
  comp_id?: string;
  affiliate?: AffiliateClubInfo | null;
  affiliatesCount?: number;
  affiliates?: ClubItem[];
  familyTeams?: ClubItem[];
  note?: string;
  inactive_fields?: string;
  is_extinct?: boolean;
  nation?: NationItem;
  confed?: ConfederationItem;
  confed_id?: string;
  comp?: CompetitionItem;
}

export interface StadiumItem {
  id: string;
  name: string;
  name_lg?: string;
  name_sh?: string;
  nation_id?: string;
  type?: 'stadium' | 'training pitch' | string;
  is_disabled?: boolean;
  isDisabled?: boolean;
  note?: string;
  inactive_fields?: string;
  nation?: NationItem;
}

export interface RegionItem {
  id: number;
  name: string;
  name_lg?: string;
  name_sh?: string;
  nation_id: string;
  code?: string;
  regionCode?: string;
  citiesCount?: number;
}

export interface CityItem {
  id: string;
  name: string;
  name_lg?: string;
  name_sh?: string;
  nation_id?: string;
  country_id?: string;
  region?: Pick<RegionItem, 'id' | 'name'> | string | null;
  region_id?: number;
  region_name?: string;
  is_remove?: boolean;
  is_disabled?: boolean;
  isDisabled?: boolean;
  inactive_fields?: string;
  nation?: NationItem;
}

export interface AwardItem {
  id: string;
  name?: string;
  name_lg?: string;
  name_sh?: string;
  name_3l?: string;
  nation_id?: string;
  comp_id?: string;
  nation?: NationItem;
  confed?: ConfederationItem;
  confed_id?: string;
  comp?: CompetitionItem;
  competition?: CompetitionItem;
}

export interface PlayerItem {
  id: string;
  first_name: string;
  common_name?: string;
  second_name: string;
}

export interface NationInfoData {
  id: string;
  name_lg?: string;
  name_sh?: string;
  name_3l?: string;
  confed?: any;
  inactive_fields?: string | null;
  note?: string | null;
  stats: {
    awards: { total: number; nation: number };
    comps: { total: number; main: number };
    stadiums: number;
    club: { total: number; other: number; extinct: number };
    region: number;
    cities: number;
  };
}

export function getNationCompetitionDisplayCount(stats: NationInfoData['stats']): number {
  const fakeCompetitionCount = Number(stats.club.other > 0) + Number(stats.club.extinct > 0);
  return stats.comps.main + fakeCompetitionCount;
}

const inFlightRequests = new Map<string, Promise<any>>();
const apiCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 60s in-memory cache

export function clearApiCache() {
  apiCache.clear();
  inFlightRequests.clear();
}

export function clearContinentsCache() {
  clearApiCache();
}

async function cachedFetch<T>(url: string, forceRefresh = false, ttl = CACHE_TTL_MS): Promise<T> {
  const now = Date.now();
  if (!forceRefresh) {
    const cached = apiCache.get(url);
    if (cached && now - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  if (!forceRefresh && inFlightRequests.has(url)) {
    return inFlightRequests.get(url) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(url);
      const data = await parseApiResponse<any>(res, `Request failed with status ${res.status}`);
      let processedData = data;
      if (data && typeof data === 'object' && Array.isArray(data.content)) {
        const arr = [...data.content] as any;
        Object.assign(arr, data);
        processedData = arr;
      }
      apiCache.set(url, { data: processedData, timestamp: Date.now() });
      return processedData as T;
    } finally {
      inFlightRequests.delete(url);
    }
  })();

  inFlightRequests.set(url, promise);
  return promise;
}

function normalizeFilterAndRefresh<T extends PaginationQuery>(
  queryOrFilter?: T | boolean | string,
  maybeForceRefresh = false,
  stringParamKey?: keyof T,
  defaultSize = 20,
): { filter: T; forceRefresh: boolean } {
  let filter: any = {};
  let forceRefresh = false;

  if (typeof queryOrFilter === 'boolean') {
    filter = {};
    forceRefresh = queryOrFilter;
  } else if (typeof queryOrFilter === 'string' && stringParamKey) {
    filter = { [stringParamKey]: queryOrFilter };
    forceRefresh = maybeForceRefresh;
  } else if (typeof queryOrFilter === 'object' && queryOrFilter !== null) {
    filter = { ...queryOrFilter };
    forceRefresh = maybeForceRefresh;
  }

  if (filter.page === undefined) filter.page = 0;
  if (filter.size === undefined) filter.size = defaultSize;
  if (filter.keyword === undefined) filter.keyword = filter.q ?? '';
  delete filter.q;

  return { filter: filter as unknown as T, forceRefresh };
}

async function cachedPost<T>(
  url: string,
  filterAndPage: any = {},
  forceRefresh = false,
  ttl = CACHE_TTL_MS,
): Promise<T> {
  const { page, size, sort, ...rawPayload } = filterAndPage || {};

  const payload: Record<string, any> = {};
  for (const [key, val] of Object.entries(rawPayload)) {
    if (val !== undefined && val !== null && val !== '') {
      payload[key] = val;
    }
  }

  // Yêu cầu: search body chỉ dùng "keyword", bỏ "q"
  const kw = rawPayload.keyword ?? rawPayload.q ?? rawPayload.query ?? '';
  payload.keyword = String(kw);
  delete payload.q;
  delete payload.query;

  // Luôn gắn ?page=...&size=... lên URL query string
  const effectivePage = page !== undefined && page !== null && page !== '' ? page : 0;
  const effectiveSize = size !== undefined && size !== null && size !== '' ? size : 20;

  const [baseUrl, existingSearch] = url.split('?');
  const queryParams = new URLSearchParams(existingSearch || '');
  if (
    rawPayload.confedId !== undefined &&
    rawPayload.confedId !== null &&
    rawPayload.confedId !== '' &&
    String(rawPayload.confedId).toLowerCase() !== 'all'
  ) {
    queryParams.set('confedId', String(rawPayload.confedId));
    delete payload.confedId;
  }
  if (
    rawPayload.nationId !== undefined &&
    rawPayload.nationId !== null &&
    rawPayload.nationId !== '' &&
    String(rawPayload.nationId).toLowerCase() !== 'all'
  ) {
    queryParams.set('nationId', String(rawPayload.nationId));
    delete payload.nationId;
  }
  if (
    rawPayload.compId !== undefined &&
    rawPayload.compId !== null &&
    rawPayload.compId !== '' &&
    String(rawPayload.compId).toLowerCase() !== 'all'
  ) {
    queryParams.set('compId', String(rawPayload.compId));
    delete payload.compId;
  }
  if (
    rawPayload.regionId !== undefined &&
    rawPayload.regionId !== null &&
    rawPayload.regionId !== '' &&
    String(rawPayload.regionId).toLowerCase() !== 'all'
  ) {
    queryParams.set('regionId', String(rawPayload.regionId));
    delete payload.regionId;
  }
  if (
    rawPayload.regionCode !== undefined &&
    rawPayload.regionCode !== null &&
    rawPayload.regionCode !== '' &&
    String(rawPayload.regionCode).toLowerCase() !== 'all'
  ) {
    queryParams.set('regionCode', String(rawPayload.regionCode));
    delete payload.regionCode;
  }
  if (
    rawPayload.category !== undefined &&
    rawPayload.category !== null &&
    rawPayload.category !== '' &&
    String(rawPayload.category).toLowerCase() !== 'all'
  ) {
    queryParams.set('category', String(rawPayload.category));
    delete payload.category;
  }
  if (
    rawPayload.extinct !== undefined &&
    rawPayload.extinct !== null &&
    rawPayload.extinct !== ''
  ) {
    queryParams.set('extinct', String(rawPayload.extinct));
    delete payload.extinct;
  }
  queryParams.set('page', String(effectivePage));
  queryParams.set('size', String(effectiveSize));
  if (sort !== undefined && sort !== null && sort !== '') {
    if (Array.isArray(sort)) {
      sort.forEach((s) => queryParams.append('sort', String(s)));
    } else {
      queryParams.set('sort', String(sort));
    }
  }

  const queryString = queryParams.toString();
  const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;
  const cacheKey = `POST::${finalUrl}::${JSON.stringify(payload)}`;
  const now = Date.now();
  if (!forceRefresh) {
    const cached = apiCache.get(cacheKey);
    if (cached && now - cached.timestamp < ttl) {
      return cached.data as T;
    }
  }

  if (!forceRefresh && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey) as Promise<T>;
  }

  const promise = (async () => {
    try {
      const res = await fetch(finalUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await parseApiResponse<any>(res, `Request failed with status ${res.status}`);
      let processedData = data;
      if (data && typeof data === 'object' && Array.isArray(data.content)) {
        const arr = [...data.content] as any;
        Object.assign(arr, data);
        if (data.totalElements !== undefined && arr.total === undefined) {
          arr.total = data.totalElements;
        }
        processedData = arr;
      }
      apiCache.set(cacheKey, { data: processedData, timestamp: Date.now() });
      return processedData as T;
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, promise);
  return promise;
}

export async function fetchListConfederations(
  queryOrForceRefresh?: PaginationQuery | boolean,
  maybeForceRefresh = false,
): Promise<ConfederationItem[]> {
  const forceRefresh =
    typeof queryOrForceRefresh === 'boolean' ? queryOrForceRefresh : maybeForceRefresh;
  const kw =
    typeof queryOrForceRefresh === 'object' && queryOrForceRefresh !== null
      ? queryOrForceRefresh.keyword || (queryOrForceRefresh as any).q || ''
      : '';
  const url = `${getApiBase()}/hierarchy/list-confederations`;
  const p = cachedFetch<ConfederationItem[]>(url, forceRefresh);
  if (kw) {
    return p.then((list) => {
      const q = kw.toLowerCase();
      return (list || []).filter(
        (c) => c.name?.toLowerCase().includes(q) || String(c.id).includes(q),
      );
    });
  }
  return p;
}

export async function fetchContinents(
  queryOrForceRefresh?: PaginationQuery | boolean,
  maybeForceRefresh = false,
): Promise<PaginatedList<ConfederationItem>> {
  return fetchListConfederations(queryOrForceRefresh, maybeForceRefresh) as Promise<
    PaginatedList<ConfederationItem>
  >;
}

export interface UnitTreeNode {
  key: string;
  title: string;
  selectable?: boolean;
  isLeaf?: boolean;
  level: number;
  className?: string;
  code3?: string;
  shortName?: string;
  noTag?: boolean;
  isInternational?: boolean;
  isOther?: boolean;
  isExtinct?: boolean;
  confed?: string;
  nationId?: string;
  regionId?: number | string;
  isRegion?: boolean;
  isRemove?: boolean;
  count?: number;
  children?: UnitTreeNode[];
}

export async function fetchUnitTree(
  type: string,
  forceRefresh = false,
): Promise<UnitTreeNode[]> {
  return cachedFetch<UnitTreeNode[]>(
    `${getApiBase()}/hierarchy/tree?type=${encodeURIComponent(type)}`,
    forceRefresh,
  );
}

export function findNodeInTree(
  nodes: UnitTreeNode[] | null | undefined,
  key: string,
): UnitTreeNode | null {
  if (!nodes || !key) return null;
  for (const node of nodes) {
    if (String(node.key) === String(key)) return node;
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, key);
      if (found) return found;
    }
  }
  return null;
}

export function findNationInTree(
  nodes: UnitTreeNode[] | null | undefined,
  nationId: string,
): UnitTreeNode | null {
  if (!nodes || !nationId || nationId === 'all') return null;
  const target = String(nationId);
  for (const node of nodes) {
    if (String(node.key) === target || node.key === `nation_${target}`) return node;
    if (node.children && node.children.length > 0) {
      const found = findNationInTree(node.children, nationId);
      if (found) return found;
    }
  }
  return null;
}

export async function fetchAllNations(
  optionsOrConfedId?: string | NationFilterQuery | boolean,
  maybeQueryOrForceRefresh?: string | boolean,
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  let filter: NationFilterQuery = {};
  let refresh = forceRefresh;

  if (typeof optionsOrConfedId === 'string') {
    filter = {
      confedId: optionsOrConfedId,
      keyword: typeof maybeQueryOrForceRefresh === 'string' ? maybeQueryOrForceRefresh : '',
    };
    refresh =
      typeof maybeQueryOrForceRefresh === 'boolean' ? maybeQueryOrForceRefresh : forceRefresh;
  } else if (typeof optionsOrConfedId === 'boolean') {
    refresh = optionsOrConfedId;
  } else if (typeof optionsOrConfedId === 'object' && optionsOrConfedId !== null) {
    filter = { ...optionsOrConfedId };
    refresh =
      typeof maybeQueryOrForceRefresh === 'boolean' ? maybeQueryOrForceRefresh : forceRefresh;
  }
  if (filter.size === undefined) filter.size = 300;
  if (filter.page === undefined) filter.page = 0;
  if (filter.keyword === undefined) filter.keyword = '';
  return cachedPost<PaginatedList<NationItem>>(
    `${getApiBase()}/hierarchy/nations/search`,
    filter,
    refresh,
  );
}

export async function fetchAllCompetitions(
  queryOrForceRefresh?: CompetitionFilterQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if ((filter as any).nationId) {
    return fetchDomesticCompetitions((filter as any).nationId, filter, refresh);
  }
  return fetchIntCompetitions((filter as any).confedId, filter, refresh);
}

export async function fetchCompetitionsList(
  queryOrForceRefresh?: (CompetitionFilterQuery & { scope?: 'all' | 'domestic' | 'international' }) | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  const scope = (filter as any).scope || 'all';
  const confedId = (filter as any).confedId;
  const nationId = (filter as any).nationId;

  if (scope === 'international') {
    const res: any = await fetchIntCompetitions(confedId, filter, refresh);
    const list = Array.isArray(res) ? res : res?.content || [];
    list.forEach((item: any) => { item.is_international = true; });
    return res;
  }

  if (scope === 'domestic') {
    const res: any = await fetchDomesticCompetitions(nationId || 'all', filter, refresh);
    const list = Array.isArray(res) ? res : res?.content || [];
    list.forEach((item: any) => { item.is_international = false; });
    return res;
  }

  // scope === 'all':
  if (nationId && nationId !== 'all') {
    const res: any = await fetchDomesticCompetitions(nationId, filter, refresh);
    const list = Array.isArray(res) ? res : res?.content || [];
    list.forEach((item: any) => { item.is_international = false; });
    return res;
  }

  // Query both and combine
  const [intRes, domRes] = await Promise.all([
    fetchIntCompetitions(confedId, { ...filter, page: 0, size: 100 }, refresh).catch(() => [] as any),
    fetchDomesticCompetitions('all', filter, refresh).catch(() => [] as any),
  ]);

  const intList = (Array.isArray(intRes) ? intRes : (intRes as any)?.content || []).map((c: any) => ({
    ...c,
    is_international: true,
  }));
  const domList = (Array.isArray(domRes) ? domRes : (domRes as any)?.content || []).map((c: any) => ({
    ...c,
    is_international: false,
  }));

  const combined = [...intList, ...domList];
  const total = (intRes?.totalElements ?? intList.length) + (domRes?.totalElements ?? domList.length);

  const page = filter.page || 0;
  const size = filter.size || 20;
  const start = page * size;
  const pageItems = combined.slice(start, start + size);

  const result: any = pageItems;
  result.content = pageItems;
  result.totalElements = total;
  result.totalPages = Math.ceil(total / size);
  result.page = page;
  result.size = size;
  result.first = page === 0;
  result.last = start + size >= total;
  return result;
}

export async function fetchNationsByContinent(
  confedId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    confedId !== undefined &&
    confedId !== null &&
    String(confedId).trim() !== '' &&
    String(confedId).toLowerCase() !== 'all'
  ) {
    (filter as any).confedId = String(confedId);
  }
  return cachedPost<PaginatedList<NationItem>>(
    `${getApiBase()}/hierarchy/nations/search`,
    filter,
    refresh,
  );
}

export async function searchNations(
  query?: PaginationQuery & { confedId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<NationItem>> {
  return fetchNationsByContinent(query?.confedId, query, forceRefresh);
}

export async function fetchIntCompetitions(
  confedId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    confedId !== undefined &&
    confedId !== null &&
    String(confedId).trim() !== '' &&
    String(confedId).toLowerCase() !== 'all'
  ) {
    (filter as any).confedId = String(confedId);
  }
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/int-competitions/search`,
    filter,
    refresh,
  );
}

export async function searchIntCompetitions(
  query?: PaginationQuery & { confedId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  return fetchIntCompetitions(query?.confedId, query, forceRefresh);
}

export async function fetchNationInfo(
  nationId: string,
  forceRefresh = false,
): Promise<NationInfoData> {
  const data = await cachedFetch<any>(
    `${getApiBase()}/hierarchy/nations/${nationId}/info`,
    forceRefresh,
  );
  const stats = data.stats || {};
  return {
    id: data.id,
    name_lg: data.name_lg,
    name_sh: data.name_sh,
    name_3l: data.name_3l,
    confed: data.confed,
    inactive_fields: data.inactive_fields,
    note: data.note,
    stats: {
      awards: {
        total: stats.totalAwards ?? 0,
        nation: stats.awards ?? 0,
      },
      comps: {
        total: stats.comps ?? 0,
        main: stats.parentComps ?? 0,
      },
      stadiums: stats.stadiums ?? 0,
      club: {
        total: stats.allClubs ?? stats.clubs ?? 0,
        other: stats.independentClubs ?? 0,
        extinct: stats.extinctClubs ?? 0,
      },
      region: stats.regions ?? 0,
      cities: stats.cities ?? 0,
    },
  };
}

export async function fetchDomesticCompetitions(
  nationId?: string | null,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (
    nationId !== undefined &&
    nationId !== null &&
    String(nationId).trim() !== '' &&
    String(nationId).toLowerCase() !== 'all'
  ) {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/domestic-competitions/search`,
    filter,
    refresh,
  );
}

export async function searchDomesticCompetitions(
  query?: PaginationQuery & { nationId?: string | null },
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  return fetchDomesticCompetitions(query?.nationId, query, forceRefresh);
}

export async function fetchIndependentClubs(
  nationId: string,
  filterOrExtinct?: IndependentClubFilterQuery | boolean | string,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  let filter: IndependentClubFilterQuery = {};
  let refresh = forceRefresh;
  if (typeof filterOrExtinct === 'boolean' || typeof filterOrExtinct === 'string') {
    filter = { extinct: filterOrExtinct };
  } else if (typeof filterOrExtinct === 'object' && filterOrExtinct !== null) {
    filter = { ...filterOrExtinct };
  }
  if (filter.size === undefined) filter.size = 20;
  if (filter.page === undefined) filter.page = 0;
  if (filter.keyword === undefined) filter.keyword = '';
  const isExtinct = String(filter.extinct) === 'true';
  const compId = isExtinct ? `ext-${nationId}` : `oth-${nationId}`;
  delete filter.extinct;
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    {
      ...filter,
      nationId,
      compId,
    },
    refresh,
  );
}

export async function fetchAllClubsInNation(
  nationId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function fetchClubsInComp(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (compId && String(compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(compId);
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function searchClubs(
  query?: PaginationQuery & {
    nationId?: string | null;
    compId?: string | null;
    confedId?: string | null;
    extinct?: boolean | string;
  },
  forceRefresh = false,
): Promise<PaginatedList<ClubItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    query,
    forceRefresh,
    undefined,
    20,
  );
  if (query?.confedId && String(query.confedId).toLowerCase() !== 'all') {
    (filter as any).confedId = String(query.confedId);
  }
  if (query?.nationId && String(query.nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(query.nationId);
  }
  if (query?.compId && String(query.compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(query.compId);
  }
  if (query?.extinct !== undefined) {
    (filter as any).extinct = query.extinct;
  }
  return cachedPost<PaginatedList<ClubItem>>(
    `${getApiBase()}/hierarchy/club/search`,
    filter,
    refresh,
  );
}

export async function fetchCompetitionInfo(
  compId: string,
  forceRefresh = false,
): Promise<CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }> {
  const competition = await cachedFetch<
    CompetitionItem & { clubsCount: number; awardsCount: number; childrenCount?: number }
  >(`${getApiBase()}/hierarchy/competitions/${compId}/info`, forceRefresh);

  const competitionInfo = { ...competition } as any;
  delete competitionInfo.is_international;
  delete competitionInfo.name;
  delete competitionInfo.parent;
  delete competitionInfo.totalChildren;
  if (competitionInfo.nation) {
    competitionInfo.nation = { ...competitionInfo.nation };
    delete competitionInfo.nation.is_international;
    delete competitionInfo.nation.name;
    delete competitionInfo.nation.parent;
    delete competitionInfo.nation.totalChildren;
  }
  return competitionInfo;
}

export async function fetchConfederationInfo(
  confedId: string,
  forceRefresh = false,
): Promise<
  ConfederationItem & {
    totalNations: number;
    totalIntComps: number;
    totalComps: number;
    totalClubs: number;
    totalStadiums: number;
    totalCities: number;
    totalAwards: number;
  }
> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/continents/${confedId}/info`, forceRefresh);
}

export async function fetchClubInfo(
  clubId: string,
  forceRefresh = false,
): Promise<ClubItem> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/clubs/${clubId}/info`, forceRefresh);
}

export async function fetchCityInfo(
  cityId: string,
  forceRefresh = false,
): Promise<CityItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/cities/${cityId}/info`, forceRefresh);
}

export async function fetchAwardInfo(
  awardId: string,
  forceRefresh = false,
): Promise<
  AwardItem & { nation_name?: string; nation_three_letter?: string; competition_name?: string }
> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/awards/${awardId}/info`, forceRefresh);
}

export async function fetchStadiumInfo(
  stadiumId: string,
  forceRefresh = false,
): Promise<StadiumItem & { nation_name?: string; nation_three_letter?: string }> {
  return cachedFetch<any>(`${getApiBase()}/hierarchy/stadiums/${stadiumId}/info`, forceRefresh);
}

export async function fetchEntityInfo(
  type: string,
  id: string,
  forceRefresh = false,
): Promise<any> {
  return cachedFetch<any>(`${getApiBase()}/records/${type}/${id}/info`, forceRefresh);
}

export async function fetchSubCompetitions(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CompetitionItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    1000,
  );
  return cachedPost<PaginatedList<CompetitionItem>>(
    `${getApiBase()}/hierarchy/competitions/${compId}/sub-competitions`,
    filter,
    refresh,
  );
}

export async function fetchStadiums(
  nationId: string,
  queryOrForceRefresh?: (PaginationQuery & { confedId?: string }) | boolean,
  forceRefresh = false,
): Promise<PaginatedList<StadiumItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  if ((queryOrForceRefresh as any)?.confedId) {
    (filter as any).confedId = (queryOrForceRefresh as any).confedId;
  }
  return cachedPost<PaginatedList<StadiumItem>>(
    `${getApiBase()}/hierarchy/stadiums/search`,
    filter,
    refresh,
  );
}

export async function fetchCities(
  nationId: string,
  queryOrForceRefresh?: (CityFilterQuery & { confedId?: string }) | boolean,
  forceRefresh = false,
): Promise<PaginatedList<CityItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  if ((queryOrForceRefresh as any)?.confedId) {
    (filter as any).confedId = (queryOrForceRefresh as any).confedId;
  }
  return cachedPost<PaginatedList<CityItem>>(
    `${getApiBase()}/hierarchy/cities/search`,
    filter,
    refresh,
  );
}

export async function fetchRegions(
  nationId?: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<RegionItem[]> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
  );
  const target = nationId && String(nationId).toLowerCase() !== 'all' ? String(nationId) : '';
  const kw = (filter as any)?.keyword || (queryOrForceRefresh as any)?.keyword || '';
  const params = new URLSearchParams();
  if (target) params.set('nationId', target);
  if (kw) params.set('keyword', kw);
  const qs = params.toString();
  const url = qs ? `${getApiBase()}/hierarchy/regions?${qs}` : `${getApiBase()}/hierarchy/regions`;
  return cachedFetch<RegionItem[]>(url, refresh);
}

export async function fetchAllRegionsByNation(
  nationId: string,
  forceRefresh = false,
): Promise<RegionItem[]> {
  return fetchRegions(nationId, false, forceRefresh);
}

export async function fetchClubAffiliates(
  clubId: string,
  forceRefresh = false,
): Promise<ClubItem[]> {
  return cachedFetch<ClubItem[]>(
    `${getApiBase()}/hierarchy/clubs/${clubId}/affiliates`,
    forceRefresh,
  );
}

export async function fetchAwards(
  nationId: string | null,
  queryOrForceRefresh?: (PaginationQuery & { confedId?: string }) | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (nationId && String(nationId).toLowerCase() !== 'all') {
    (filter as any).nationId = String(nationId);
  }
  if ((queryOrForceRefresh as any)?.confedId) {
    (filter as any).confedId = (queryOrForceRefresh as any).confedId;
  }
  return cachedPost<PaginatedList<AwardItem>>(
    `${getApiBase()}/hierarchy/awards/search`,
    filter,
    refresh,
  );
}

export async function fetchAwardsInComp(
  compId: string,
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  if (compId && String(compId).toLowerCase() !== 'all') {
    (filter as any).compId = String(compId);
  }
  return cachedPost<PaginatedList<AwardItem>>(
    `${getApiBase()}/hierarchy/awards/search`,
    filter,
    refresh,
  );
}

export async function fetchAllAwards(
  queryOrForceRefresh?: PaginationQuery | boolean,
  forceRefresh = false,
): Promise<PaginatedList<AwardItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrForceRefresh,
    forceRefresh,
    undefined,
    20,
  );
  return cachedPost<PaginatedList<AwardItem>>(`${getApiBase()}/hierarchy/awards`, filter, refresh);
}

export async function fetchPlayers(
  queryOrFilter?: PaginationQuery | string | boolean,
  forceRefresh = false,
): Promise<PaginatedList<PlayerItem>> {
  const { filter, forceRefresh: refresh } = normalizeFilterAndRefresh(
    queryOrFilter,
    forceRefresh,
    'keyword',
    20,
  );
  return cachedPost<PaginatedList<PlayerItem>>(
    `${getApiBase()}/hierarchy/players`,
    filter,
    refresh,
  );
}

export async function quickSearch(query: string, limit = 20) {
  const res = await fetch(`${getApiBase()}/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: query, limit }),
  });
  return parseApiResponse(res, 'Search failed');
}

export async function createRecord(type: RecordType | string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseApiResponse(res, 'Create failed');
}

export async function updateRecord(type: RecordType | string, id: string, data: any) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return parseApiResponse(res, 'Update failed');
}

export async function deleteRecord(type: RecordType | string, id: string) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/records/${type}/${id}`, {
    method: 'DELETE',
  });
  return parseApiResponse(res, 'Delete failed');
}

export async function reimportLnc() {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseApiResponse(res, 'Reimport failed');
}

export function getExportUrl(): string {
  return `${getApiBase()}/lnc/export?download=true`;
}

// Cờ tạm thời tắt hiển thị ảnh theo yêu cầu người dùng
export const ENABLE_IMAGE_LOGOS = false;

export function getConfederationLogoUrl(id: string): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getApiBase()}/logos/confederation/${id}`;
}

export function getNationLogoUrl(id: string, code?: string): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  const query = code ? `?code=${encodeURIComponent(code)}` : '';
  return `${getApiBase()}/logos/nation/${id}${query}`;
}

/**
 * Cờ quốc gia lấy từ nguồn FIFA (dùng mã 3 ký tự FIFA, vd: AUS, ENG, VIE).
 */
export function getFifaFlagUrl(code?: string | null): string {
  const c = (code || '').trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) return '';
  return `https://api.fifa.com/api/v3/picture/flags-sq-2/${c}`;
}

export function getLocalFlagUrl(code?: string | null, useOtherFolder = false): string {
  const normalized = (code || '').trim().toLowerCase();
  if (!/^[a-z]{3}$/.test(normalized)) return '';
  return `/flag/${useOtherFolder ? 'other/' : ''}${normalized}.png`;
}

export function getCompetitionLogoUrl(id: string | number): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getApiBase()}/logos/competition/${id}`;
}

export function getClubLogoUrl(id: string | number): string {
  if (!ENABLE_IMAGE_LOGOS) return '';
  return `${getApiBase()}/logos/club/${id}`;
}

export interface AppPathsConfig {
  lncDir: string;
  confedLogoDir: string;
  nationLogoDir: string;
  compLogoDir: string;
  clubLogoDir: string;
}

export interface DirCheckStatus {
  path: string;
  exists: boolean;
  fileCount?: number;
}

export interface ConfigStatusResponse {
  config: AppPathsConfig;
  status: {
    lnc: {
      dir: string;
      exists: boolean;
      files: {
        cityNation: { name: string; exists: boolean; size?: number; mtime?: string };
        clubStadium: { name: string; exists: boolean; size?: number; mtime?: string };
        compOther: { name: string; exists: boolean; size?: number; mtime?: string };
      };
      allFilesFound: boolean;
    };
    confedLogo: DirCheckStatus;
    nationLogo: DirCheckStatus;
    compLogo: DirCheckStatus;
    clubLogo: DirCheckStatus;
  };
}

export async function fetchAppConfig(): Promise<ConfigStatusResponse> {
  const res = await fetch(`${getApiBase()}/config`, {
    cache: 'no-store',
  });
  return parseApiResponse<ConfigStatusResponse>(
    res,
    'Không thể tải cấu hình thư mục local từ backend localhost:3001',
  );
}

export async function updateAppConfig(
  config: Partial<AppPathsConfig>,
): Promise<ConfigStatusResponse> {
  const res = await fetch(`${getApiBase()}/config`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  return parseApiResponse<ConfigStatusResponse>(res, 'Không thể cập nhật cấu hình local');
}

export async function testDirectoryPath(targetPath: string) {
  const res = await fetch(`${getApiBase()}/config/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath }),
  });
  return parseApiResponse(res, 'Kiểm tra thư mục local thất bại');
}

export async function syncLncFromConfig() {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/config/sync`, {
    method: 'POST',
  });
  return parseApiResponse(res, 'Đồng bộ LNC local thất bại');
}

export async function reloadLogosFromConfig() {
  const res = await fetch(`${getApiBase()}/config/reload-logos`, {
    method: 'POST',
  });
  return parseApiResponse(res, 'Quét lại logo local thất bại');
}

export async function uploadLncFiles(files: { name: string; content: string }[]) {
  clearApiCache();
  const res = await fetch(`${getApiBase()}/lnc/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ files }),
  });
  return parseApiResponse(res, 'Upload failed');
}

export async function syncLocalLncToProd(): Promise<{ success: boolean; message: string }> {
  clearApiCache();
  const exportRes = await fetch(`${getApiBase()}/lnc/export`);
  if (!exportRes.ok) {
    throw new Error('Không thể đọc dữ liệu LNC từ backend local');
  }
  const lncContent = await exportRes.text();
  return uploadLncFiles([{ name: 'FM24_Merged_Names.lnc', content: lncContent }]);
}
