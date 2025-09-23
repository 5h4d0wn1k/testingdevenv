-- Install pg_trgm extension for fuzzy text matching and similarity functions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on searchVector for efficient full-text search
CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING gin("searchVector");

-- Create function to update product search vector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW."searchVector" :=
        setweight(to_tsvector('english', COALESCE(NEW."name", '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW."description", '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(NEW."tags", ' ')), 'C') ||
        setweight(to_tsvector('english', COALESCE((SELECT "name" FROM "Category" WHERE "id" = NEW."categoryId"), '') || ' ' || COALESCE(NEW."subcategory", '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS product_search_vector_trigger ON "Product";
CREATE TRIGGER product_search_vector_trigger
    BEFORE INSERT OR UPDATE ON "Product"
    FOR EACH ROW EXECUTE FUNCTION update_product_search_vector();

-- Update existing products to populate search vectors
UPDATE "Product" SET "name" = "name" WHERE "searchVector" IS NULL;