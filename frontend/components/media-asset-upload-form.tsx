'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import {
  useCreateMediaAssetLinkMutation,
  useGetServicesQuery,
  useUploadMediaAssetMutation,
} from '@/lib/redux/api';
import {
  IMAGE_MEDIA_ASSET_TYPES,
  MEDIA_ASSET_TYPE_LABELS,
  MediaAssetType,
} from '@/lib/types/enums';

// Two creation paths behind one type selector, mirroring the backend's own split
// (backend/CLAUDE.md's Phase 6 scope decision): PHOTO/GRAPHIC/THUMBNAIL show a file
// picker and go through a real Cloudinary upload; VIDEO_CLIP/FULL_RECORDING show a
// URL field instead, since video content usually already lives on YouTube via the
// service's Broadcast and never actually uploads here.
export function MediaAssetUploadForm() {
  const { data: currentUser } = useCurrentUser();
  const currentUserId = currentUser?._id ?? null;
  const { data: services } = useGetServicesQuery();
  const [uploadImage, { isLoading: isUploading }] = useUploadMediaAssetMutation();
  const [createLink, { isLoading: isLinking }] = useCreateMediaAssetLinkMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [type, setType] = useState<MediaAssetType>(MediaAssetType.PHOTO);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState('');

  const isImageType = IMAGE_MEDIA_ASSET_TYPES.includes(type);
  const isLoading = isUploading || isLinking;

  function resetForm() {
    setUrl('');
    setTags('');
    setServiceId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit() {
    if (!currentUserId) {
      toast.error('Log in first to add media.');
      return;
    }

    try {
      if (isImageType) {
        const file = fileInputRef.current?.files?.[0];
        if (!file) {
          toast.error('Choose a file first.');
          return;
        }
        await uploadImage({
          file,
          type,
          service: serviceId ?? undefined,
          uploaded_by: currentUserId,
          tags: tags.trim() || undefined,
        }).unwrap();
      } else {
        if (!url.trim()) {
          toast.error('Paste a URL first.');
          return;
        }
        await createLink({
          type,
          storage_url: url.trim(),
          service: serviceId ?? undefined,
          uploaded_by: currentUserId,
          tags: tags
            ? tags.split(',').map((t) => t.trim()).filter(Boolean)
            : undefined,
        }).unwrap();
      }
      toast.success(`${MEDIA_ASSET_TYPE_LABELS[type]} added`);
      resetForm();
    } catch (error) {
      const message =
        error && typeof error === 'object' && 'data' in error
          ? (error.data as { message?: string })?.message
          : undefined;
      toast.error(message ?? 'Could not add this asset.');
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <p className="text-heading-md text-foreground">Add media</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Type</Label>
          <Select value={type} onValueChange={(v) => v && setType(v as MediaAssetType)}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-40">
              <SelectValue>{() => MEDIA_ASSET_TYPE_LABELS[type]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(MediaAssetType).map((t) => (
                <SelectItem key={t} value={t}>
                  {MEDIA_ASSET_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-auto">
          <Label className="mb-1.5">Service (optional)</Label>
          <Select value={serviceId} onValueChange={setServiceId}>
            <SelectTrigger className="w-full sm:w-auto sm:min-w-44">
              <SelectValue>
                {(value: string | null) =>
                  services?.find((s) => s._id === value)?.name ?? 'None'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {services?.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isImageType ? (
          <div className="flex-1">
            <Label className="mb-1.5">File (image, max 10MB)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="text-body-sm block h-11 w-full cursor-pointer rounded-xl border border-input bg-transparent px-3 py-2 shadow-xs file:mr-3 file:h-full file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:text-primary-foreground"
            />
          </div>
        ) : (
          <div className="flex-1">
            <Label className="mb-1.5">URL (e.g. YouTube link)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." />
          </div>
        )}

        <div className="flex-1">
          <Label className="mb-1.5">Tags (comma-separated, optional)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="faith series, pastor adeyemi" />
        </div>

        <Button onClick={handleSubmit} disabled={isLoading || !currentUserId} className="w-full sm:w-auto">
          Add
        </Button>
      </div>

      {!currentUserId && (
        <p className="text-caption text-muted-foreground">
          Log in to add media.
        </p>
      )}
    </div>
  );
}
