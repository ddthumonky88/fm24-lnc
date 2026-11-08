/**
 * Utility functions for accent-insensitive search and record matching.
 */

/**
 * Normalizes text for search comparison:
 * - Lowercases
 * - Decomposes and strips Unicode combining diacritical marks (e.g., é -> e, ë -> e, à -> a)
 * - Replaces non-decomposing accented characters (e.g., Vietnamese đ/Đ, Polish ł/Ł, Nordic ø/Ø, German ß)
 * - Trims whitespace
 */
export function normalizeSearchText(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'o')
    .replace(/ß/g, 'ss')
    .trim();
}

/**
 * Checks whether an entity record matches a search query string.
 * Supports diacritics-insensitive matching across common fields:
 * id, name, name_lg, name_sh, name_6l, name_3l, first_name, second_name, common_name,
 * categories, note, region, etc.
 */
export function matchRecordSearch(
  record: any,
  query: string,
  extraFields: (string | number | undefined | null)[] = [],
): boolean {
  if (!record) return false;
  if (!query) return true;
  const rawQuery = query.toLowerCase().trim();
  if (!rawQuery) return true;
  const normQuery = normalizeSearchText(query);

  const candidateValues: any[] = [
    record.id,
    record.name,
    record.name_lg,
    record.name_sh,
    record.name_6l,
    record.name_3l,
    record.first_name,
    record.second_name,
    record.common_name,
    record.type,
    record.categories,
    record.note,
    record.region,
    record.city_name,
    record.stadium_name,
    record.nation?.name,
    record.nation?.name_lg,
    record.nation?.name_sh,
    record.nation?.name_3l,
    record.confed?.name,
    record.parent?.name,
    record.parent?.name_lg,
    record.parent?.name_sh,
    record.parent?.name_3l,
    record.parent_comp?.name,
    record.parent_comp?.name_lg,
    record.parent_comp?.name_sh,
    record.parent_comp?.name_3l,
    record.affiliate?.name,
    record.affiliate?.name_lg,
    record.affiliate?.name_sh,
    record.affiliate?.name_6l,
    record.affiliate?.name_3l,
    record.affiliate?.type,
    record.comp?.name,
    record.comp?.name_lg,
    record.comp?.name_sh,
    record.comp?.name,
    record.comp?.name_lg,
    record.comp?.name_sh,
    record.comp?.name_3l,
    ...extraFields,
  ];

  if (record.first_name || record.second_name) {
    candidateValues.push(`${record.first_name || ''} ${record.second_name || ''}`.trim());
  }

  for (const val of candidateValues) {
    if (val === null || val === undefined) continue;
    const str = String(val).toLowerCase();
    if (str.includes(rawQuery)) return true;
    if (normQuery) {
      const norm = normalizeSearchText(str);
      if (norm.includes(normQuery)) return true;
    }
  }

  return false;
}
