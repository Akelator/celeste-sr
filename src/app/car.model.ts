export interface RawCarFromJson {
  position: number;
  manufacturer: string;
  model: string;
  category: string;
  performanceIndex: number;
  performanceClass: string;
  country: string;
  unlockMethods: string[];
  dlcPack: string | null;
}

export interface Car {
  position: number;
  manufacturer: string;
  year: number;
  name: string;
  performanceIndex: number;
  performanceClass: string;
  unlockMethods: string[];
  dlcPack: string | null;
  owned: boolean;
  hasPhoto: boolean;
  carDetail: CarDetail;
}

export type NewCar = Omit<Car, 'owned' | 'hasPhoto' | 'carDetail'>;

export const NEW_CAR_TEMPLATE: NewCar = {
  position: 0,
  manufacturer: 'Ferrari',
  year: 2023,
  name: 'Daytona',
  performanceIndex: 500,
  performanceClass: 'S1',
  unlockMethods: [],
  dlcPack: null
};

export function isNewCar(value: unknown): value is NewCar {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as {
    position?: unknown;
    manufacturer?: unknown;
    year?: unknown;
    name?: unknown;
    performanceIndex?: unknown;
    performanceClass?: unknown;
    unlockMethods?: unknown;
    dlcPack?: unknown;
  };

  return (
    typeof candidate.position === 'number'
    && typeof candidate.manufacturer === 'string'
    && typeof candidate.year === 'number'
    && typeof candidate.name === 'string'
    && typeof candidate.performanceIndex === 'number'
    && typeof candidate.performanceClass === 'string'
    && Array.isArray(candidate.unlockMethods)
    && candidate.unlockMethods.every((unlockMethod) => typeof unlockMethod === 'string')
    && (candidate.dlcPack === null || typeof candidate.dlcPack === 'string')
  );
}

export interface CarFlagsByIndex {
  index: number;
  owned: boolean;
  hasPhoto: boolean;
}

export const BEST_MASTERY_TYPES = ['secret-car', 'money'] as const;
export type BestMasteryType = (typeof BEST_MASTERY_TYPES)[number];

export const BEST_MASTERY_OPTIONS = ['none', ...BEST_MASTERY_TYPES] as const;
export type BestMasteryOption = (typeof BEST_MASTERY_OPTIONS)[number];

export function isBestMasteryType(value: unknown): value is BestMasteryType {
  return typeof value === 'string' && (BEST_MASTERY_TYPES as readonly string[]).includes(value);
}

export interface BestMastery {
  type: BestMasteryType;
  money?: number;
  secretCar?: string;
}

export interface CarDetail {
  carId: string;
  masteryDone: boolean;
  bestMastery?: BestMastery;
}
