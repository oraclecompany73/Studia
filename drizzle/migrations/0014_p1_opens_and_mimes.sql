-- One open log per student per event file (stops spam that inflates engagement stats).
DELETE FROM public.material_opens a
USING public.material_opens b
WHERE a.user_id = b.user_id
  AND a.event_id = b.event_id
  AND a.material_id = b.material_id
  AND a.opened_at > b.opened_at;

DELETE FROM public.material_opens a
USING public.material_opens b
WHERE a.user_id = b.user_id
  AND a.event_id = b.event_id
  AND a.material_id = b.material_id
  AND a.opened_at = b.opened_at
  AND a.id > b.id;

CREATE UNIQUE INDEX IF NOT EXISTS material_opens_user_event_material_uidx
  ON public.material_opens (user_id, event_id, material_id);

-- Align storage MIME allow-list with admin upload accept (Word + existing types).
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4',
  'application/octet-stream'
]
WHERE id = 'materials';
