-- Add bpmn_xml column to workflows table
ALTER TABLE public.workflows ADD COLUMN IF NOT EXISTS bpmn_xml text;
