-- Reference catalog for equipment autocomplete (DCC-style gear)
CREATE TABLE "item_catalog" (
    "id" UUID NOT NULL,
    "category" "ItemCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "properties" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "item_catalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_catalog_category_name_key" ON "item_catalog"("category", "name");
CREATE INDEX "item_catalog_category_idx" ON "item_catalog"("category");
