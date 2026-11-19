CREATE TABLE public.docs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'General ICT',
  system text,
  summary text,
  body text,
  snippets jsonb NOT NULL DEFAULT '[]'::jsonb,
  images text[] NOT NULL DEFAULT '{}',
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.docs TO authenticated;
GRANT ALL ON public.docs TO service_role;
ALTER TABLE public.docs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team reads docs" ON public.docs FOR SELECT TO authenticated USING (true);
CREATE POLICY "team adds docs" ON public.docs FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "team edits docs" ON public.docs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "author deletes docs" ON public.docs FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER docs_touch BEFORE UPDATE ON public.docs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();