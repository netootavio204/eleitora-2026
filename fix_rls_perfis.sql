-- ============================================================
-- FIX: RLS da tabela perfis
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Remove policies antigas
DROP POLICY IF EXISTS "perfis_admin_update" ON perfis;
DROP POLICY IF EXISTS "perfis_admin_delete" ON perfis;

-- UPDATE: ADM pode alterar qualquer perfil (USING verifica quem faz,
-- WITH CHECK true permite qualquer valor novo — sem restrição de conteúdo)
CREATE POLICY "perfis_admin_update" ON perfis
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (true);

-- DELETE: somente ADM pode excluir perfis de outros usuários
CREATE POLICY "perfis_admin_delete" ON perfis
  FOR DELETE TO authenticated
  USING (
    id != auth.uid()
    AND EXISTS (
      SELECT 1 FROM perfis
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
