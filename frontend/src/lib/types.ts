/** Wire types — mirror the FastAPI Pydantic schemas (camelCase aliases). */

export type FitStatus = "fits" | "no-fit" | "universal" | "unknown";
export type Priority = "balanced" | "cheap" | "quality" | "fast";
export type DueStatus = "ok" | "soon" | "overdue";

export interface FitResult {
  status: FitStatus;
  reason: string;
}

export interface Offer {
  sellerId: string;
  sellerName: string;
  sellerTrust: number;
  priceToman: number;
  inStock: boolean;
  warrantyMonths: number;
  shippingDays: number;
  isOriginal: boolean;
  url: string;
  rawTitle: string;
}

export interface Product {
  id: string;
  key: string;
  title: string;
  category: string;
  group: string;
  brand: string | null;
  brandName: string;
  brandTier: number;
  attributes: {
    position?: "front" | "rear" | null;
    viscosity?: string | null;
    volumeL?: number | null;
    ampere?: number | null;
    plugCode?: string | null;
    line?: string | null;
  };
  fitment: { platforms: string[]; vehicleIds: string[] };
  offers: Offer[];
  minPrice: number;
  avgPrice: number;
  priceHistory: { date: string; price: number }[];
  confidence: number;
}

export interface RankedResult {
  product: Product;
  score: number;
  fit: FitResult;
  bestOffer: Offer;
  reasons: string[];
  breakdown: Record<string, number>;
  savingVsAvg: number;
}

export interface SearchIntent {
  raw: string;
  categories: string[];
  vehicleIds: string[];
  brand: string | null;
  viscosity: string | null;
  position: "front" | "rear" | null;
  maxPrice: number | null;
  priority: Priority;
  terms: string[];
}

export interface SearchResponse {
  intent: SearchIntent;
  results: RankedResult[];
  vehicleId: string | null;
  vehicleTitle: string | null;
  activeVehicleTitle: string | null;
  anyCar: boolean;
  weights: { key: string; label: string; weight: number }[];
}

export interface CategoryGroup {
  id: string;
  title: string;
  subtitle: string;
  children: string[];
}

export interface Meta {
  groups: CategoryGroup[];
  categories: { id: string; title: string; group: string }[];
  brands: { id: string; name: string }[];
  vehicles: { id: string; title: string; bodyType: string; years: [number, number] }[];
}

export type Role = "customer" | "seller" | "admin";

export interface Me {
  userId: string;
  name: string;
  phone: string;
  role: Role;
  status: "active" | "pending" | "blocked";
  shopName: string | null;
  activeVehicle: { id: string; modelId: string; title: string; bodyType: string; color: string | null } | null;
}

export interface ProductDetail {
  product: Product;
  categoryTitle: string;
  fit: FitResult;
  garageFits: { vehicleId: string; title: string; fit: FitResult }[];
  trend30d: number;
  similar: RankedResult[];
}

export interface CompareResponse {
  activeVehicleTitle: string | null;
  items: { product: Product; categoryTitle: string; fit: FitResult; trend30d: number }[];
}

export interface ServiceStatus {
  serviceId: string;
  title: string;
  category: string;
  basis: string;
  intervalKm: number;
  intervalMonths: number;
  lastKm: number;
  lastDate: string;
  estimated: boolean;
  nextKm: number;
  nextDate: string;
  remainingKm: number;
  remainingDays: number;
  progress: number;
  status: DueStatus;
}

export interface GarageVehicle {
  vehicle: { id: string; modelId: string; year: number; odometerKm: number; plate: string | null; nickname: string | null; color: string | null; addedAt: string };
  model: { id: string; engine: string; bodyType: string };
  title: string;
  services: ServiceStatus[];
  due: number;
  totalCost: number;
  history: { id: string; vehicleId: string; serviceId: string; km: number; date: string; cost: number | null }[];
}

export interface Garage {
  userId: string;
  name: string;
  activeVehicleId: string | null;
  maxVehicles: number;
  vehicles: GarageVehicle[];
  selectedVehicleId: string | null;
  needed: { serviceId: string; serviceTitle: string; result: RankedResult }[];
}

export interface IngestionReport {
  ranAt: string;
  sources: { id: string; name: string; fetched: number }[];
  rawCount: number;
  normalizedCount: number;
  rejected: { raw: { externalId: string; title: string; sellerName: string }; reason: string }[];
  productCount: number;
  lowConfidence: number;
  durationMs: number;
  samples: { before: string; after: string; productId: string }[];
}

export interface DayCount {
  day: string;
  clicks: number;
}

export interface SellerListing {
  productId: string;
  title: string;
  category: string;
  group: string;
  brand: string | null;
  myPrice: number;
  inStock: boolean;
  lowestPrice: number;
  rank: number;
  sellers: number;
  isCheapest: boolean;
  gapToman: number;
  suggestedPrice: number | null;
  clicks: number;
  edited: boolean;
}

export interface SellerDashboard {
  sellerId: string;
  shopName: string;
  status: "active" | "pending" | "blocked";
  trust: number | null;
  listings: SellerListing[];
  totalClicks: number;
  clicks7d: number;
  cheapestCount: number;
  daily: DayCount[];
}

export interface AdminOverview {
  usersByRole: Record<string, number>;
  pendingSellers: number;
  products: number;
  offers: number;
  totalClicks: number;
  daily: DayCount[];
  topProducts: { productId: string; title: string; clicks: number }[];
  shops: {
    sellerId: string;
    name: string;
    source: "crawled" | "registered";
    trust: number | null;
    listings: number;
    clicks: number;
    ownerId: string | null;
    ownerName: string | null;
    ownerPhone: string | null;
    status: "active" | "pending" | "blocked" | "unclaimed";
  }[];
  users: { id: string; name: string; phone: string; role: Role; status: string; shopName: string | null; vehicles: number; createdAt: string }[];
  rawListings: number;
  rejectedListings: number;
  lowConfidence: number;
  lastCrawl: string;
}
