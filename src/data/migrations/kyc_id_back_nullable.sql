-- Allow id_back_url to be NULL for single-sided IDs (e.g. passport).
-- No need to duplicate id_front_url when user only uploads one ID image.
ALTER TABLE kyc ALTER COLUMN id_back_url DROP NOT NULL;
