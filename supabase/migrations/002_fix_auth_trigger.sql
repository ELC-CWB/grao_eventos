-- ================================================
-- FIX: Trigger de criação de perfil + políticas de acesso
-- ================================================

-- 1. Corrige o trigger para NÃO bloquear criação de usuário caso o insert falhe
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'manager')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca falha a criação do usuário auth mesmo se o perfil não for criado
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Remove a política de INSERT restritiva (impedia o trigger de inserir)
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- 3. Permite que qualquer usuário autenticado crie seu próprio perfil
--    (necessário para o cadastro self-service via signUp)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (
    auth.uid() = id
  );

-- 4. Permite que admins insiram perfis de outros usuários
CREATE POLICY "Admins can insert any profile" ON profiles
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) = 'admin'
  );

-- 5. Garante que os usuários podem atualizar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 6. Admins podem atualizar qualquer perfil
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
CREATE POLICY "Admins can update profiles" ON profiles
  FOR UPDATE USING (get_user_role(auth.uid()) = 'admin');
