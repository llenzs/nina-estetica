import React, { useEffect, useState } from 'react';
import { Camera, Loader2, ImageOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface ContactPhoto {
  id: string;
  storage_url: string | null;
  storage_path: string;
  caption: string | null;
  body_area: string | null;
  taken_at: string;
  notes: string | null;
}

interface ContactPhotosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  contactName?: string | null;
}

export const ContactPhotosSheet: React.FC<ContactPhotosSheetProps> = ({
  open,
  onOpenChange,
  contactId,
  contactName
}) => {
  const [photos, setPhotos] = useState<ContactPhoto[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !contactId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('contact_photos')
        .select('id, storage_url, storage_path, caption, body_area, taken_at, notes')
        .eq('contact_id', contactId)
        .order('taken_at', { ascending: false })
        .limit(60);

      if (!cancelled) {
        if (error) console.error('Erro carregando fotos:', error);
        setPhotos((data as unknown as ContactPhoto[]) || []);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, contactId]);

  const groupedByMonth = photos.reduce<Record<string, ContactPhoto[]>>((acc, p) => {
    const month = new Date(p.taken_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(p);
    return acc;
  }, {});

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Fotos {contactName ? `· ${contactName}` : 'da cliente'}
          </SheetTitle>
          <SheetDescription>
            Imagens que a cliente enviou pelo WhatsApp, arquivadas pra você consultar antes da avaliação. A Nina nunca analisa essas fotos — só persiste pra você ver.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          )}

          {!loading && photos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
              <ImageOff className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-foreground font-medium">Nenhuma foto recebida</p>
              <p className="text-sm text-muted-foreground mt-1">
                As fotos que a cliente mandar pelo WhatsApp vão aparecer aqui automaticamente.
              </p>
            </div>
          )}

          {!loading && Object.entries(groupedByMonth).map(([month, items]) => (
            <div key={month}>
              <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-3">
                {month}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {items.map((p) => (
                  <div key={p.id} className="rounded-xl overflow-hidden border border-border bg-card/60">
                    {p.storage_url ? (
                      <img
                        src={p.storage_url}
                        alt={p.caption || 'Foto da cliente'}
                        className="w-full aspect-square object-cover"
                      />
                    ) : (
                      <div className="w-full aspect-square flex items-center justify-center bg-muted/30 text-muted-foreground text-xs">
                        <span>baixando…</span>
                      </div>
                    )}
                    <div className="p-2">
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(p.taken_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {p.caption && (
                        <div className="text-xs text-foreground mt-1 line-clamp-2">{p.caption}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ContactPhotosSheet;
