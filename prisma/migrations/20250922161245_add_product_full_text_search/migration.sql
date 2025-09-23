-- Add full-text search functionality to Product table

-- Create trigger function to update searchVector
CREATE OR REPLACE FUNCTION update_product_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  -- Update searchVector with weighted tsvector from multiple fields
  NEW."searchVector" := setweight(to_tsvector('english', COALESCE(NEW."name", '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW."description", '')), 'B') ||
                        setweight(to_tsvector('english', array_to_string(COALESCE(NEW."tags", '{}'), ' ')), 'C') ||
                        setweight(to_tsvector('english',
                          COALESCE((SELECT c."name" FROM "Category" c WHERE c."id" = NEW."categoryId"), '') || ' ' ||
                          COALESCE(NEW."subcategory", '')
                        ), 'D');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that calls the function on INSERT and UPDATE
CREATE TRIGGER product_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "Product"
  FOR EACH ROW
  EXECUTE FUNCTION update_product_search_vector();

-- Create GIN index on searchVector for efficient full-text search queries
CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Populate searchVector for existing products
UPDATE "Product"
SET "searchVector" = setweight(to_tsvector('english', COALESCE("name", '')), 'A') ||
                     setweight(to_tsvector('english', COALESCE("description", '')), 'B') ||
                     setweight(to_tsvector('english', array_to_string(COALESCE("tags", '{}'), ' ')), 'C') ||
                     setweight(to_tsvector('english',
                       COALESCE((SELECT c."name" FROM "Category" c WHERE c."id" = "Product"."categoryId"), '') || ' ' ||
                       COALESCE("subcategory", '')
                     ), 'D')
WHERE "searchVector" IS NULL;