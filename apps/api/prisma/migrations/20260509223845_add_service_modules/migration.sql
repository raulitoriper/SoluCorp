-- CreateEnum
CREATE TYPE "VisitEventType" AS ENUM ('START', 'END', 'QUICK');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceCategory" AS ENUM ('PRESENCE', 'BREAK', 'LUNCH');

-- CreateEnum
CREATE TYPE "AttendanceAction" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "GuardShiftEventType" AS ENUM ('SHIFT_START', 'SHIFT_END', 'MARK');

-- CreateEnum
CREATE TYPE "MedicalVisitEventType" AS ENUM ('CLINIC_START', 'CLINIC_END', 'MEDIC_START', 'MEDIC_END', 'CLINIC_QUICK', 'PRODUCT_REGISTER');

-- CreateEnum
CREATE TYPE "CourierDeliveryStatus" AS ENUM ('DELIVERED', 'NOT_DELIVERED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

-- CreateTable
CREATE TABLE "visits" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_code" TEXT NOT NULL,
    "motive_code" TEXT,
    "event_type" "VisitEventType" NOT NULL,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_code" TEXT NOT NULL,
    "price_list" TEXT,
    "sale_condition" TEXT,
    "observation" TEXT,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount_gs" INTEGER NOT NULL DEFAULT 0,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit_price_gs" DECIMAL(12,0),
    "discount_pct" DECIMAL(5,2),
    "subtotal_gs" DECIMAL(12,0),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gps_locations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "altitude" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "battery_level" INTEGER,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gps_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_records" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "deposit_code" TEXT NOT NULL,
    "product_code" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_events" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "employee_code" TEXT NOT NULL,
    "event_category" "AttendanceCategory" NOT NULL,
    "event_action" "AttendanceAction" NOT NULL,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guard_shifts" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "guard_code" TEXT NOT NULL,
    "event_type" "GuardShiftEventType" NOT NULL DEFAULT 'MARK',
    "place" TEXT,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guard_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_visits" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "event_type" "MedicalVisitEventType" NOT NULL,
    "clinic_code" TEXT,
    "medic_code" TEXT,
    "motive_code" TEXT,
    "initial_km" DECIMAL(10,2),
    "next_visit_date" TIMESTAMP(3),
    "should_notify" BOOLEAN NOT NULL DEFAULT false,
    "notification_desc" TEXT,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_visit_products" (
    "id" TEXT NOT NULL,
    "medical_visit_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,

    CONSTRAINT "medical_visit_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_deliveries" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "CourierDeliveryStatus" NOT NULL,
    "receiver_name" TEXT,
    "motive_code" TEXT,
    "observation" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "marked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "courier_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courier_items" (
    "id" TEXT NOT NULL,
    "courier_delivery_id" TEXT NOT NULL,
    "line_number" INTEGER NOT NULL,
    "barcode" TEXT NOT NULL,

    CONSTRAINT "courier_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "result_id" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visits_company_id_idx" ON "visits"("company_id");

-- CreateIndex
CREATE INDEX "visits_company_id_user_id_marked_at_idx" ON "visits"("company_id", "user_id", "marked_at");

-- CreateIndex
CREATE INDEX "orders_company_id_idx" ON "orders"("company_id");

-- CreateIndex
CREATE INDEX "orders_company_id_user_id_marked_at_idx" ON "orders"("company_id", "user_id", "marked_at");

-- CreateIndex
CREATE INDEX "orders_company_id_status_idx" ON "orders"("company_id", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "gps_locations_company_id_user_id_recorded_at_idx" ON "gps_locations"("company_id", "user_id", "recorded_at");

-- CreateIndex
CREATE INDEX "gps_locations_company_id_recorded_at_idx" ON "gps_locations"("company_id", "recorded_at");

-- CreateIndex
CREATE INDEX "inventory_records_company_id_idx" ON "inventory_records"("company_id");

-- CreateIndex
CREATE INDEX "inventory_records_company_id_deposit_code_idx" ON "inventory_records"("company_id", "deposit_code");

-- CreateIndex
CREATE INDEX "attendance_events_company_id_idx" ON "attendance_events"("company_id");

-- CreateIndex
CREATE INDEX "attendance_events_company_id_employee_code_marked_at_idx" ON "attendance_events"("company_id", "employee_code", "marked_at");

-- CreateIndex
CREATE INDEX "guard_shifts_company_id_idx" ON "guard_shifts"("company_id");

-- CreateIndex
CREATE INDEX "guard_shifts_company_id_guard_code_marked_at_idx" ON "guard_shifts"("company_id", "guard_code", "marked_at");

-- CreateIndex
CREATE INDEX "medical_visits_company_id_idx" ON "medical_visits"("company_id");

-- CreateIndex
CREATE INDEX "medical_visits_company_id_clinic_code_idx" ON "medical_visits"("company_id", "clinic_code");

-- CreateIndex
CREATE INDEX "medical_visit_products_medical_visit_id_idx" ON "medical_visit_products"("medical_visit_id");

-- CreateIndex
CREATE INDEX "courier_deliveries_company_id_idx" ON "courier_deliveries"("company_id");

-- CreateIndex
CREATE INDEX "courier_deliveries_company_id_status_idx" ON "courier_deliveries"("company_id", "status");

-- CreateIndex
CREATE INDEX "courier_items_courier_delivery_id_idx" ON "courier_items"("courier_delivery_id");

-- CreateIndex
CREATE UNIQUE INDEX "sync_queue_idempotency_key_key" ON "sync_queue"("idempotency_key");

-- CreateIndex
CREATE INDEX "sync_queue_company_id_user_id_status_idx" ON "sync_queue"("company_id", "user_id", "status");

-- CreateIndex
CREATE INDEX "sync_queue_idempotency_key_idx" ON "sync_queue"("idempotency_key");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_visit_products" ADD CONSTRAINT "medical_visit_products_medical_visit_id_fkey" FOREIGN KEY ("medical_visit_id") REFERENCES "medical_visits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "courier_items" ADD CONSTRAINT "courier_items_courier_delivery_id_fkey" FOREIGN KEY ("courier_delivery_id") REFERENCES "courier_deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
