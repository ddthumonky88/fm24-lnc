export enum RecordType {
  COMPETITION = 'competition',
  CLUB = 'club',
  STADIUM = 'stadium',
  CITY = 'city',
  AWARD = 'award',
  PLAYER = 'player',
  REGION = 'region',
}

export type RecordTypeValue = RecordType | `${RecordType}`;

export enum EntityType {
  CONFEDERATION = 'confederation',
  NATION = 'nation',
  COMPETITION = 'competition',
  CLUB = 'club',
  STADIUM = 'stadium',
  CITY = 'city',
  AWARD = 'award',
  PLAYER = 'player',
  REGION = 'region',
}

export type EntityTypeValue = EntityType | `${EntityType}`;

export enum HierarchyLevel {
  CONTINENTS = 'CONTINENTS',
  INT_COMPETITIONS = 'INT_COMPETITIONS',
  NATIONS = 'NATIONS',
  NATION_HUB = 'NATION_HUB',
  DOMESTIC_COMPS = 'DOMESTIC_COMPS',
  CLUBS_IN_COMP = 'CLUBS_IN_COMP',
  INDEPENDENT_CLUBS = 'INDEPENDENT_CLUBS',
  STADIUMS = 'STADIUMS',
  CITIES = 'CITIES',
  INDEPENDENT_AWARDS = 'INDEPENDENT_AWARDS',
  COMP_AWARDS = 'COMP_AWARDS',
  GLOBAL_PLAYERS = 'GLOBAL_PLAYERS',
  GLOBAL_STAGES = 'GLOBAL_STAGES',
  GLOBAL_AWARDS = 'GLOBAL_AWARDS',
}

export type HierarchyLevelValue = HierarchyLevel | `${HierarchyLevel}`;

export enum NationTabKey {
  DOMESTIC_COMPS = 'domesticComps',
  STADIUMS = 'stadiums',
  CITIES = 'cities',
  AWARDS = 'awards',
  REGIONS = 'regions',
  INFO = 'info',
}

export type NationTabKeyValue = NationTabKey | `${NationTabKey}`;

export type QuickAddType = RecordTypeValue;
