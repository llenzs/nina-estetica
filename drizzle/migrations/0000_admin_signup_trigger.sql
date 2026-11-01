DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
INSERT INTO public.profiles (user_id, full_name) SELECT 'efd3b875-0f8b-4e1d-9e1a-4d830709a4c3', 'Enzo Campos Da Silva' WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id='efd3b875-0f8b-4e1d-9e1a-4d830709a4c3');
INSERT INTO public.user_roles (user_id, role) VALUES ('efd3b875-0f8b-4e1d-9e1a-4d830709a4c3','admin') ON CONFLICT DO NOTHING;