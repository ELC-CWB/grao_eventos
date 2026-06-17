-- Adiciona tipo de fornecedor (pessoa física ou jurídica), CNPJ e razão social
ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS supplier_type TEXT NOT NULL DEFAULT 'pf' CHECK (supplier_type IN ('pf', 'pj')),
  ADD COLUMN IF NOT EXISTS cnpj TEXT,
  ADD COLUMN IF NOT EXISTS company_name TEXT;
