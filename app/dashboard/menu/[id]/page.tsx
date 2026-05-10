'use client';
// app/dashboard/menu/[id]/page.tsx
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  GripVertical, Save, ArrowLeft, Eye, EyeOff,
} from 'lucide-react';
import ImageUpload from '@/components/ImageUpload';

// ── Category-specific default sections ────────────────────────────────────
const CATEGORY_DEFAULTS: Record<string, string[]> = {
  restaurants:  ['Entrées', 'Plats principaux', 'Desserts', 'Boissons'],
  cafes:        ['Cafés & Thés', 'Jus & Smoothies', 'Pâtisseries', 'Snacks'],
  hammams:      ['Soins du corps', 'Massages', 'Forfaits'],
  riads:        ['Chambres', 'Suites', 'Services'],
  patisseries:  ['Gâteaux', 'Viennoiseries', 'Boissons chaudes', 'Boissons froides'],
  snacks:       ['Sandwichs', 'Grillades', 'Salades', 'Boissons'],
  beauty:       ['Soins visage', 'Soins corps', 'Coiffure', 'Forfaits'],
  fitness:      ['Abonnements', 'Cours collectifs', 'Coaching personnel'],
  hotels:       ['Chambres', 'Suites', 'Services', 'Restauration'],
};

// ── Types ──────────────────────────────────────────────────────────────────
interface MenuItem {
  id:          string;
  name:        string;
  description: string;
  price:       string;   // string for input control, parsed to number on save
  photos:      string[];
  available:   boolean;
}

interface MenuSection {
  id:       string;
  name:     string;
  items:    MenuItem[];
  expanded: boolean;
}

function newItem(): MenuItem {
  return { id: crypto.randomUUID(), name: '', description: '', price: '', photos: [], available: true };
}

function newSection(name = ''): MenuSection {
  return { id: crypto.randomUUID(), name, items: [newItem()], expanded: true };
}

// ── Page ───────────────────────────────────────────────────────────────────
export default function MenuEditorPage() {
  const { id: businessId } = useParams<{ id: string }>();
  const router = useRouter();

  const [sections,  setSections]  = useState<MenuSection[]>([]);
  const [business,  setBusiness]  = useState<{ name: string; category: string } | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);

  // ── Load existing menu + business info ───────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const [bizRes, menuRes] = await Promise.all([
          fetch(`/api/businesses/${businessId}`),
          fetch(`/api/businesses/${businessId}/menu`),
        ]);

        if (!bizRes.ok) { toast.error('Business not found'); router.push('/dashboard'); return; }

        const { business: biz } = await bizRes.json();
        setBusiness({ name: biz.name, category: biz.category });

        const menu = await menuRes.json();

        if (menu.sections?.length > 0) {
          // Restore saved menu
          setSections(menu.sections.map((s: any) => ({
            id:       crypto.randomUUID(),
            name:     s.name,
            expanded: true,
            items:    s.items.map((item: any) => ({
              id:          crypto.randomUUID(),
              name:        item.name,
              description: item.description ?? '',
              price:       item.price !== undefined ? String(item.price) : '',
              photos:      item.photos ?? [],
              available:   item.available !== false,
            })),
          })));
        } else {
          // First time — pre-populate with category defaults
          const defaults = CATEGORY_DEFAULTS[biz.category] ?? ['Articles'];
          setSections(defaults.map((name) => newSection(name)));
        }
      } catch {
        toast.error('Failed to load menu');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [businessId, router]);

  // ── Section helpers ───────────────────────────────────────────────────────
  function addSection() {
    setSections((prev) => [...prev, newSection()]);
  }

  function removeSection(sectionId: string) {
    if (!confirm('Delete this section and all its items?')) return;
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function updateSectionName(sectionId: string, name: string) {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, name } : s));
  }

  function toggleSection(sectionId: string) {
    setSections((prev) => prev.map((s) => s.id === sectionId ? { ...s, expanded: !s.expanded } : s));
  }

  // ── Item helpers ──────────────────────────────────────────────────────────
  function addItem(sectionId: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: [...s.items, newItem()] } : s
    ));
  }

  function removeItem(sectionId: string, itemId: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.filter((i) => i.id !== itemId) } : s
    ));
  }

  function updateItem(sectionId: string, itemId: string, field: keyof MenuItem, value: any) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((i) => i.id === itemId ? { ...i, [field]: value } : i) }
        : s
    ));
  }

  function addPhoto(sectionId: string, itemId: string, url: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? {
        ...s,
        items: s.items.map((i) =>
          i.id === itemId && i.photos.length < 3
            ? { ...i, photos: [...i.photos, url] }
            : i
        ),
      } : s
    ));
  }

  function removePhoto(sectionId: string, itemId: string, url: string) {
    setSections((prev) => prev.map((s) =>
      s.id === sectionId ? {
        ...s,
        items: s.items.map((i) =>
          i.id === itemId ? { ...i, photos: i.photos.filter((p) => p !== url) } : i
        ),
      } : s
    ));
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  async function handleSave() {
    // Validate — every section needs a name, every item needs a name
    for (const section of sections) {
      if (!section.name.trim()) { toast.error('All sections need a name'); return; }
      for (const item of section.items) {
        if (!item.name.trim()) { toast.error(`All items need a name (in section "${section.name}")`); return; }
      }
    }

    setSaving(true);
    try {
      const payload = {
        sections: sections.map((s) => ({
          name:  s.name,
          items: s.items.map((i) => ({
            name:        i.name,
            description: i.description || undefined,
            price:       i.price !== '' ? parseFloat(i.price) : undefined,
            photos:      i.photos,
            available:   i.available,
          })),
        })),
      };

      const res = await fetch(`/api/businesses/${businessId}/menu`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Menu saved!');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save menu');
    } finally {
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-400 text-sm">Loading menu…</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Menu Editor</h1>
            {business && (
              <p className="text-sm text-gray-400">{business.name} · <span className="capitalize">{business.category}</span></p>
            )}
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save Menu'}
        </button>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, si) => (
          <div key={section.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

            {/* Section header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-gray-50 border-b border-gray-100">
              <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
              <input
                value={section.name}
                onChange={(e) => updateSectionName(section.id, e.target.value)}
                placeholder="Section name (e.g. Plats principaux)"
                className="flex-1 text-sm font-semibold text-gray-900 bg-transparent outline-none
                           border-b border-transparent focus:border-brand-400 transition-colors py-0.5"
              />
              <button onClick={() => toggleSection(section.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors">
                {section.expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <button onClick={() => removeSection(section.id)}
                className="text-gray-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Items */}
            {section.expanded && (
              <div className="divide-y divide-gray-50">
                {section.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    sectionId={section.id}
                    onUpdate={updateItem}
                    onRemove={removeItem}
                    onAddPhoto={addPhoto}
                    onRemovePhoto={removePhoto}
                  />
                ))}

                {/* Add item */}
                <div className="px-5 py-3">
                  <button
                    onClick={() => addItem(section.id)}
                    className="flex items-center gap-2 text-sm text-brand-500 font-medium
                               hover:text-brand-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add item
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add section */}
      <button
        onClick={addSection}
        className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl
                   border-2 border-dashed border-gray-200 text-sm text-gray-400
                   hover:border-brand-300 hover:text-brand-500 transition-colors"
      >
        <Plus className="w-4 h-4" /> Add section
      </button>

      {/* Save (bottom) */}
      {sections.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save Menu'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── ItemRow ────────────────────────────────────────────────────────────────
function ItemRow({
  item, sectionId,
  onUpdate, onRemove, onAddPhoto, onRemovePhoto,
}: {
  item:          MenuItem;
  sectionId:     string;
  onUpdate:      (sId: string, iId: string, field: keyof MenuItem, value: any) => void;
  onRemove:      (sId: string, iId: string) => void;
  onAddPhoto:    (sId: string, iId: string, url: string) => void;
  onRemovePhoto: (sId: string, iId: string, url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`px-5 py-4 ${!item.available ? 'opacity-50' : ''}`}>
      {/* Main row */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-3">
            <input
              value={item.name}
              onChange={(e) => onUpdate(sectionId, item.id, 'name', e.target.value)}
              placeholder="Item name *"
              className="flex-1 text-sm font-medium text-gray-900 outline-none border-b border-transparent
                         focus:border-brand-400 transition-colors py-0.5 bg-transparent"
            />
            <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <span>MAD</span>
              <input
                value={item.price}
                onChange={(e) => onUpdate(sectionId, item.id, 'price', e.target.value)}
                placeholder="—"
                type="number"
                min="0"
                step="0.5"
                className="w-20 text-right outline-none border-b border-transparent focus:border-brand-400
                           transition-colors py-0.5 bg-transparent text-gray-700"
              />
            </div>
          </div>

          {/* Description toggle */}
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="text-xs text-gray-400 hover:text-brand-500 transition-colors"
            >
              {item.description ? item.description.slice(0, 60) + (item.description.length > 60 ? '…' : '') : '+ Add description & photos'}
            </button>
          ) : (
            <div className="space-y-3">
              <textarea
                value={item.description}
                onChange={(e) => onUpdate(sectionId, item.id, 'description', e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full text-xs text-gray-600 outline-none border border-gray-100 rounded-xl
                           p-2.5 resize-none focus:ring-2 focus:ring-brand-100 transition-colors bg-gray-50"
              />

              {/* Photos */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Photos ({item.photos.length}/3)</p>
                <div className="flex gap-2 flex-wrap">
                  {item.photos.map((url) => (
                    <div key={url} className="relative w-16 h-16">
                      <img src={url} alt="" className="w-16 h-16 object-cover rounded-xl" />
                      <button
                        onClick={() => onRemovePhoto(sectionId, item.id, url)}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full
                                   flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {item.photos.length < 3 && (
                    <div className="w-16 h-16">
                      <ImageUpload
                        value=""
                        onChange={(url) => { if (url) onAddPhoto(sectionId, item.id, url); }}
                        folder="locallens/businesses"
                        label=""
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>

              <button onClick={() => setExpanded(false)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                Collapse ↑
              </button>
            </div>
          )}
        </div>

        {/* Available toggle + delete */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
          <button
            onClick={() => onUpdate(sectionId, item.id, 'available', !item.available)}
            title={item.available ? 'Mark as unavailable' : 'Mark as available'}
            className={`transition-colors ${item.available ? 'text-green-500 hover:text-gray-400' : 'text-gray-300 hover:text-green-500'}`}
          >
            {item.available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onRemove(sectionId, item.id)}
            className="text-gray-300 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}