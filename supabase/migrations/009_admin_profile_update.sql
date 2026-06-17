-- Allow admins to update any user's profile (role, name, phone, etc.)
CREATE POLICY "Admins can update any profile" ON profiles FOR UPDATE USING (
  get_user_role(auth.uid()) = 'admin'
);
