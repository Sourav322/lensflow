// ─────────────────────────────────────────────────────────────────────────────
//  LensFlow – Prisma Schema
//  Database: PostgreSQL
// ─────────────────────────────────────────────────────────────────────────────

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ═══════════════════════════════════════════════════════════════════
//  ENUMS
// ═══════════════════════════════════════════════════════════════════

enum UserRole {
  admin
  staff
  optometrist
}

enum OrderStatus {
  pending
  confirmed
  processing
  ready
  delivered
  cancelled
}

enum LabOrderStatus {
  pending
  sent_to_lab
  in_progress
  quality_check
  ready
  delivered
  cancelled
}

enum RepairStatus {
  received
  diagnosing
  repairing
  quality_check
  ready
  delivered
  cancelled
}

enum PaymentMode {
  cash
  upi
  card
  netbanking
  cheque
  credit
}

enum FrameType {
  full_rim
  half_rim
  rimless
  sports
}

enum LensType {
  single_vision
  bifocal
  progressive
  toric
  colored
}

// ═══════════════════════════════════════════════════════════════════
//  SHOP  (multi-tenant root)
// ═══════════════════════════════════════════════════════════════════

model Shop {
  id        String   @id @default(cuid())
  name      String
  address   String?
  city      String?
  state     String?
  pincode   String?
  phone     String?
  email     String?
  gstin     String?
  logo      String?
  currency  String   @default("INR")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users        User[]
  customers    Customer[]
  frames       Frame[]
  lenses       Lens[]
  accessories  Accessory[]
  orders       Order[]
  labOrders    LabOrder[]
  repairs      Repair[]
  invoices     Invoice[]
  staff        Staff[]
}

// ═══════════════════════════════════════════════════════════════════
//  USERS / AUTH
// ═══════════════════════════════════════════════════════════════════

model User {
  id           String    @id @default(cuid())
  shopId       String
  name         String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(staff)
  avatar       String?
  isActive     Boolean   @default(true)
  lastLogin    DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  shop          Shop           @relation(fields: [shopId], references: [id], onDelete: Cascade)
  prescriptions Prescription[]
  orders        Order[]        @relation("CreatedBy")
  refreshTokens RefreshToken[]

  @@index([shopId])
  @@index([email])
}

model RefreshToken {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([token])
}

// ═══════════════════════════════════════════════════════════════════
//  STAFF  (HR records – separate from login users)
// ═══════════════════════════════════════════════════════════════════

model Staff {
  id        String    @id @default(cuid())
  shopId    String
  name      String
  role      String
  phone     String?
  email     String?
  salary    Decimal   @default(0) @db.Decimal(10, 2)
  joinDate  DateTime?
  isActive  Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  shop Shop @relation(fields: [shopId], references: [id], onDelete: Cascade)

  @@index([shopId])
}

// ═══════════════════════════════════════════════════════════════════
//  CUSTOMERS  (CRM)
// ═══════════════════════════════════════════════════════════════════

model Customer {
  id            String    @id @default(cuid())
  shopId        String
  name          String
  mobile        String
  email         String?
  city          String?
  address       String?
  dateOfBirth   DateTime?
  loyaltyPoints Int       @default(0)
  totalSpent    Decimal   @default(0) @db.Decimal(12, 2)
  totalOrders   Int       @default(0)
  notes         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shop          Shop           @relation(fields: [shopId], references: [id], onDelete: Cascade)
  prescriptions Prescription[]
  orders        Order[]
  repairs       Repair[]

  @@index([shopId])
  @@index([mobile])
  @@index([shopId, mobile])
}

// ═══════════════════════════════════════════════════════════════════
//  PRESCRIPTIONS
// ═══════════════════════════════════════════════════════════════════

model Prescription {
  id         String    @id @default(cuid())
  customerId String
  doctorId   String?
  date       DateTime  @default(now())

  // Right eye
  reSph  Decimal? @db.Decimal(5, 2)
  reCyl  Decimal? @db.Decimal(5, 2)
  reAxis Int?
  reAdd  Decimal? @db.Decimal(5, 2)
  reVa   String?

  // Left eye
  leSph  Decimal? @db.Decimal(5, 2)
  leCyl  Decimal? @db.Decimal(5, 2)
  leAxis Int?
  leAdd  Decimal? @db.Decimal(5, 2)
  leVa   String?

  ipd       Decimal?  @db.Decimal(5, 2)
  notes     String?
  nextVisit DateTime?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  customer  Customer   @relation(fields: [customerId], references: [id], onDelete: Cascade)
  doctor    User?      @relation(fields: [doctorId],   references: [id])
  labOrders LabOrder[]

  @@index([customerId])
  @@index([doctorId])
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTORY – FRAMES
// ═══════════════════════════════════════════════════════════════════

model Frame {
  id        String     @id @default(cuid())
  shopId    String
  barcode   String?    @unique
  brand     String
  model     String
  color     String?
  size      String?
  material  String?
  type      FrameType?
  gender    String?
  costPrice Decimal    @db.Decimal(10, 2)
  sellPrice Decimal    @db.Decimal(10, 2)
  mrp       Decimal?   @db.Decimal(10, 2)
  stock     Int        @default(0)
  minStock  Int        @default(2)
  imageUrl  String?
  isActive  Boolean    @default(true)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  shop       Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]

  @@index([shopId])
  @@index([barcode])
  @@index([shopId, isActive])
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTORY – LENSES
// ═══════════════════════════════════════════════════════════════════

model Lens {
  id         String   @id @default(cuid())
  shopId     String
  barcode    String?  @unique
  brand      String
  type       LensType
  coating    String?
  index      Decimal? @db.Decimal(3, 2)
  powerRange String?
  costPrice  Decimal  @db.Decimal(10, 2)
  sellPrice  Decimal  @db.Decimal(10, 2)
  stock      Int      @default(0)
  minStock   Int      @default(2)
  isActive   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  shop       Shop       @relation(fields: [shopId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]
  labOrders  LabOrder[]

  @@index([shopId])
  @@index([shopId, isActive])
}

// ═══════════════════════════════════════════════════════════════════
//  INVENTORY – ACCESSORIES
// ═══════════════════════════════════════════════════════════════════

model Accessory {
  id        String   @id @default(cuid())
  shopId    String
  barcode   String?  @unique
  name      String
  category  String?
  brand     String?
  costPrice Decimal  @db.Decimal(10, 2)
  sellPrice Decimal  @db.Decimal(10, 2)
  stock     Int      @default(0)
  minStock  Int      @default(2)
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shop       Shop        @relation(fields: [shopId], references: [id], onDelete: Cascade)
  orderItems OrderItem[]

  @@index([shopId])
}

// ═══════════════════════════════════════════════════════════════════
//  ORDERS  (POS / billing)
// ═══════════════════════════════════════════════════════════════════

model Order {
  id            String      @id @default(cuid())
  shopId        String
  orderNumber   String      @unique
  customerId    String
  createdById   String
  status        OrderStatus @default(pending)
  subtotal      Decimal     @db.Decimal(12, 2)
  discountType  String?     // "flat" | "percent"
  discountValue Decimal     @default(0) @db.Decimal(10, 2)
  discountAmt   Decimal     @default(0) @db.Decimal(10, 2)
  taxPct        Decimal     @default(0) @db.Decimal(5, 2)
  taxAmt        Decimal     @default(0) @db.Decimal(10, 2)
  total         Decimal     @db.Decimal(12, 2)
  paymentMode   PaymentMode @default(cash)
  amountPaid    Decimal     @default(0) @db.Decimal(12, 2)
  changeGiven   Decimal     @default(0) @db.Decimal(10, 2)
  notes         String?
  deliveryDate  DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  shop      Shop       @relation(fields: [shopId],     references: [id], onDelete: Cascade)
  customer  Customer   @relation(fields: [customerId], references: [id])
  createdBy User       @relation("CreatedBy", fields: [createdById], references: [id])
  items     OrderItem[]
  invoice   Invoice?
  labOrder  LabOrder?

  @@index([shopId])
  @@index([customerId])
  @@index([orderNumber])
  @@index([shopId, createdAt])
}

model OrderItem {
  id          String  @id @default(cuid())
  orderId     String
  itemType    String  // "frame" | "lens" | "accessory"
  frameId     String?
  lensId      String?
  accessoryId String?
  name        String
  qty         Int     @default(1)
  unitPrice   Decimal @db.Decimal(10, 2)
  total       Decimal @db.Decimal(10, 2)

  order     Order      @relation(fields: [orderId],     references: [id], onDelete: Cascade)
  frame     Frame?     @relation(fields: [frameId],     references: [id])
  lens      Lens?      @relation(fields: [lensId],      references: [id])
  accessory Accessory? @relation(fields: [accessoryId], references: [id])

  @@index([orderId])
  @@index([frameId])
  @@index([lensId])
}

// ═══════════════════════════════════════════════════════════════════
//  INVOICES
// ═══════════════════════════════════════════════════════════════════

model Invoice {
  id            String    @id @default(cuid())
  shopId        String
  orderId       String    @unique
  invoiceNumber String    @unique
  dueDate       DateTime?
  notes         String?
  pdfUrl        String?
  sentViaWA     Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  shop  Shop  @relation(fields: [shopId],  references: [id], onDelete: Cascade)
  order Order @relation(fields: [orderId], references: [id])

  @@index([shopId])
  @@index([invoiceNumber])
}

// ═══════════════════════════════════════════════════════════════════
//  LAB ORDERS
// ═══════════════════════════════════════════════════════════════════

model LabOrder {
  id             String         @id @default(cuid())
  shopId         String
  labOrderNumber String         @unique
  orderId        String?        @unique
  prescriptionId String?
  lensId         String?
  labName        String
  status         LabOrderStatus @default(pending)
  sentDate       DateTime?
  expectedDate   DateTime?
  receivedDate   DateTime?
  cost           Decimal?       @db.Decimal(10, 2)
  notes          String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  shop         Shop          @relation(fields: [shopId],         references: [id], onDelete: Cascade)
  order        Order?        @relation(fields: [orderId],        references: [id])
  prescription Prescription? @relation(fields: [prescriptionId], references: [id])
  lens         Lens?         @relation(fields: [lensId],         references: [id])

  @@index([shopId])
  @@index([shopId, status])
}

// ═══════════════════════════════════════════════════════════════════
//  REPAIRS
// ═══════════════════════════════════════════════════════════════════

model Repair {
  id             String       @id @default(cuid())
  shopId         String
  ticketNumber   String       @unique
  customerId     String
  status         RepairStatus @default(received)
  description    String
  itemType       String       // "frame" | "lens" | "other"
  brand          String?
  issue          String?
  estimatedCost  Decimal?     @db.Decimal(10, 2)
  finalCost      Decimal?     @db.Decimal(10, 2)
  receivedDate   DateTime     @default(now())
  estimatedDate  DateTime?
  deliveredDate  DateTime?
  notes          String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  shop     Shop     @relation(fields: [shopId],     references: [id], onDelete: Cascade)
  customer Customer @relation(fields: [customerId], references: [id])

  @@index([shopId])
  @@index([customerId])
  @@index([shopId, status])
}
