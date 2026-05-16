import React, { useState, useRef } from 'react';
import {
  useGetLandingConfigQuery,
  useUpdateLandingSectionMutation,
  useResetLandingSectionMutation,
  useUploadLandingImageMutation,
} from '../../../store/api/landingApi';
import { toast } from 'react-toastify';
import {
  ChevronRight,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Layout,
  Upload,
  X,
  ImageIcon,
} from 'lucide-react';

// ── Generic helpers ────────────────────────────────────────────────────────────

const Field = ({ label, value, onChange, textarea = false, hint }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    {hint && <p className="text-xs text-gray-400 mb-1">{hint}</p>}
    {textarea ? (
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y min-h-[72px]"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    ) : (
      <input
        type="text"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
    )}
  </div>
);

const Toggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm font-medium text-gray-700">{label}</span>
    <button
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// Simple string list editor (array of strings)
const StringListEditor = ({ label, items = [], onChange }) => {
  const update = (idx, val) => { const a = [...items]; a[idx] = val; onChange(a); };
  const add = () => onChange([...items, '']);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={item}
            onChange={(e) => update(idx, e.target.value)}
          />
          <button onClick={() => remove(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
        <Plus className="w-4 h-4" /> Add item
      </button>
    </div>
  );
};

// Link list editor: array of {label, href}
const LinkListEditor = ({ label, items = [], onChange }) => {
  const update = (idx, key, val) => {
    const a = [...items];
    a[idx] = { ...a[idx], [key]: val };
    onChange(a);
  };
  const add = () => onChange([...items, { label: '', href: '#' }]);
  const remove = (idx) => onChange(items.filter((_, i) => i !== idx));
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 mb-2">
          <input type="text" placeholder="Label" className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.label ?? ''} onChange={(e) => update(idx, 'label', e.target.value)} />
          <input type="text" placeholder="href" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.href ?? ''} onChange={(e) => update(idx, 'href', e.target.value)} />
          <button onClick={() => remove(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
        <Plus className="w-4 h-4" /> Add link
      </button>
    </div>
  );
};

// ── Section editors ────────────────────────────────────────────────────────────

const NavEditor = ({ data, onChange }) => (
  <div>
    <Field label="Brand Name" value={data.brand_name} onChange={(v) => onChange({ ...data, brand_name: v })} />
    <Field label="Login CTA Text" value={data.cta_login} onChange={(v) => onChange({ ...data, cta_login: v })} />
    <Field label="Sign Up CTA Text" value={data.cta_signup} onChange={(v) => onChange({ ...data, cta_signup: v })} />
    <LinkListEditor label="Navigation Links" items={data.links} onChange={(v) => onChange({ ...data, links: v })} />
  </div>
);

const HeroEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateStat = (idx, key, val) => {
    const stats = [...(data.stats || [])];
    stats[idx] = { ...stats[idx], [key]: val };
    setField('stats', stats);
  };
  return (
    <div>
      <Field label="Badge" value={data.badge} onChange={(v) => setField('badge', v)} />
      <Field label="Title Before Highlight" value={data.title_before} onChange={(v) => setField('title_before', v)} />
      <Field label="Title Highlight (colored)" value={data.title_highlight} onChange={(v) => setField('title_highlight', v)} />
      <Field label="Title After Highlight" value={data.title_after} onChange={(v) => setField('title_after', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <Field label="Primary CTA Button" value={data.cta_primary} onChange={(v) => setField('cta_primary', v)} />
      <Field label="Secondary CTA Button" value={data.cta_secondary} onChange={(v) => setField('cta_secondary', v)} />
      <Field label="Trust Pill – Secure" value={data.trust_secure} onChange={(v) => setField('trust_secure', v)} />
      <Field label="Trust Pill – No Card" value={data.trust_no_card} onChange={(v) => setField('trust_no_card', v)} />
      <Field label="Trusted By Text" value={data.trusted_by} onChange={(v) => setField('trusted_by', v)} />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Stats</label>
        {(data.stats || []).map((stat, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input type="text" placeholder="Value (e.g. 100+)" className="w-1/3 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={stat.value ?? ''} onChange={(e) => updateStat(idx, 'value', e.target.value)} />
            <input type="text" placeholder="Label" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={stat.label ?? ''} onChange={(e) => updateStat(idx, 'label', e.target.value)} />
          </div>
        ))}
      </div>
    </div>
  );
};

const WhyEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div>
      <Field label="Section Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Section Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <Field label="Without Column Title" value={data.without_title} onChange={(v) => setField('without_title', v)} />
      <StringListEditor label="Without Points" items={data.without_points} onChange={(v) => setField('without_points', v)} />
      <Field label="With Column Title" value={data.with_title} onChange={(v) => setField('with_title', v)} />
      <StringListEditor label="With Points" items={data.with_points} onChange={(v) => setField('with_points', v)} />
    </div>
  );
};

const FeaturesEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateItem = (idx, key, val) => {
    const items = [...(data.items || [])];
    items[idx] = { ...items[idx], [key]: val };
    setField('items', items);
  };
  const addItem = () => setField('items', [...(data.items || []), { icon: 'Star', title: '', description: '' }]);
  const removeItem = (idx) => setField('items', (data.items || []).filter((_, i) => i !== idx));
  return (
    <div>
      <Field label="Badge" value={data.badge} onChange={(v) => setField('badge', v)} />
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Feature Cards</label>
        {(data.items || []).map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Feature {idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input type="text" placeholder="Icon name (e.g. House, Wallet)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.icon ?? ''} onChange={(e) => updateItem(idx, 'icon', e.target.value)} />
            <input type="text" placeholder="Title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.title ?? ''} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
            <textarea placeholder="Description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.description ?? ''} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
          </div>
        ))}
        <button onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
          <Plus className="w-4 h-4" /> Add feature
        </button>
      </div>
    </div>
  );
};

const PersonasEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateItem = (idx, key, val) => {
    const items = [...(data.items || [])];
    items[idx] = { ...items[idx], [key]: val };
    setField('items', items);
  };
  const addItem = () => setField('items', [...(data.items || []), { icon: 'User', title: '', description: '' }]);
  const removeItem = (idx) => setField('items', (data.items || []).filter((_, i) => i !== idx));
  return (
    <div>
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Persona Cards</label>
        {(data.items || []).map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Persona {idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input type="text" placeholder="Icon name" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.icon ?? ''} onChange={(e) => updateItem(idx, 'icon', e.target.value)} />
            <input type="text" placeholder="Title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.title ?? ''} onChange={(e) => updateItem(idx, 'title', e.target.value)} />
            <textarea placeholder="Description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.description ?? ''} onChange={(e) => updateItem(idx, 'description', e.target.value)} />
          </div>
        ))}
        <button onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
          <Plus className="w-4 h-4" /> Add persona
        </button>
      </div>
    </div>
  );
};

const HowItWorksEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateStep = (idx, key, val) => {
    const steps = [...(data.steps || [])];
    steps[idx] = { ...steps[idx], [key]: val };
    setField('steps', steps);
  };
  const addStep = () => setField('steps', [...(data.steps || []), { title: '', text: '' }]);
  const removeStep = (idx) => setField('steps', (data.steps || []).filter((_, i) => i !== idx));
  return (
    <div>
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
        {(data.steps || []).map((step, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Step {idx + 1}</span>
              <button onClick={() => removeStep(idx)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input type="text" placeholder="Step title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={step.title ?? ''} onChange={(e) => updateStep(idx, 'title', e.target.value)} />
            <textarea placeholder="Step description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[56px] focus:outline-none focus:ring-2 focus:ring-primary/40" value={step.text ?? ''} onChange={(e) => updateStep(idx, 'text', e.target.value)} />
          </div>
        ))}
        <button onClick={addStep} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
          <Plus className="w-4 h-4" /> Add step
        </button>
      </div>
    </div>
  );
};

const PricingEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateTier = (idx, key, val) => {
    const tiers = [...(data.tiers || [])];
    tiers[idx] = { ...tiers[idx], [key]: val };
    setField('tiers', tiers);
  };
  return (
    <div>
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Tiers</label>
        {(data.tiers || []).map((tier, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <span className="text-xs font-semibold text-gray-500 uppercase block mb-2">Tier {idx + 1}</span>
            <input type="text" placeholder="Tier title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={tier.title ?? ''} onChange={(e) => updateTier(idx, 'title', e.target.value)} />
            <textarea placeholder="Description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[56px] mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={tier.description ?? ''} onChange={(e) => updateTier(idx, 'description', e.target.value)} />
            <input type="text" placeholder="CTA button text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={tier.cta ?? ''} onChange={(e) => updateTier(idx, 'cta', e.target.value)} />
            <StringListEditor
              label="Features"
              items={tier.features || []}
              onChange={(v) => updateTier(idx, 'features', v)}
            />
            <Toggle label="Coming Soon" value={!!tier.is_coming_soon} onChange={(v) => updateTier(idx, 'is_coming_soon', v)} />
            <Toggle label="Highlighted (primary border)" value={!!tier.is_highlighted} onChange={(v) => updateTier(idx, 'is_highlighted', v)} />
          </div>
        ))}
      </div>
    </div>
  );
};

const SlideImagePicker = ({ slide, onUrlChange }) => {
  const [uploadImage, { isLoading: isUploading }] = useUploadLandingImageMutation();
  const fileInputRef = useRef(null);
  const apiBase = import.meta.env.VITE_APP_API_URL || '';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadImage(file).unwrap();
      onUrlChange(result.url);
    } catch {
      toast.error('Image upload failed');
    }
    // reset so the same file can be re-selected if needed
    e.target.value = '';
  };

  const previewSrc = slide.image_url
    ? (slide.image_url.startsWith('http') ? slide.image_url : `${apiBase}${slide.image_url}`)
    : null;

  return (
    <div className="mt-2">
      <label className="block text-xs font-medium text-gray-600 mb-1">Slide Image</label>
      {previewSrc && (
        <div className="relative inline-block mb-2">
          <img src={previewSrc} alt="Slide preview" className="h-24 w-40 object-cover rounded-lg border border-gray-200" />
          <button
            onClick={() => onUrlChange(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            title="Remove image"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      {!previewSrc && (
        <div className="flex items-center justify-center w-40 h-24 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 mb-2">
          <ImageIcon className="w-6 h-6 text-gray-300" />
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
      >
        <Upload className="w-3.5 h-3.5" />
        {isUploading ? 'Uploading…' : previewSrc ? 'Replace image' : 'Upload image'}
      </button>
      <p className="text-xs text-gray-400 mt-1">
        Or use a preset key:{' '}
        <span className="font-mono">building · houses · laptop · profile</span>
      </p>
    </div>
  );
};

const DemoSliderEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateSlide = (idx, key, val) => {
    const slides = [...(data.slides || [])];
    slides[idx] = { ...slides[idx], [key]: val };
    setField('slides', slides);
  };
  const addSlide = () => setField('slides', [...(data.slides || []), { tag: '', title: '', description: '', image_key: 'building', image_url: null }]);
  const removeSlide = (idx) => setField('slides', (data.slides || []).filter((_, i) => i !== idx));
  return (
    <div>
      <Field label="Section Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Section Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Slides</label>
        {(data.slides || []).map((slide, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Slide {idx + 1}</span>
              <button onClick={() => removeSlide(idx)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input type="text" placeholder="Tag label" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={slide.tag ?? ''} onChange={(e) => updateSlide(idx, 'tag', e.target.value)} />
            <input type="text" placeholder="Slide title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={slide.title ?? ''} onChange={(e) => updateSlide(idx, 'title', e.target.value)} />
            <textarea placeholder="Slide description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[72px] mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={slide.description ?? ''} onChange={(e) => updateSlide(idx, 'description', e.target.value)} />
            <div className="mb-2">
              <label className="block text-xs text-gray-500 mb-1">Preset image key (used when no upload)</label>
              <input type="text" placeholder="building / houses / laptop / profile" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={slide.image_key ?? ''} onChange={(e) => updateSlide(idx, 'image_key', e.target.value)} />
            </div>
            <SlideImagePicker
              slide={slide}
              onUrlChange={(url) => updateSlide(idx, 'image_url', url)}
            />
          </div>
        ))}
        <button onClick={addSlide} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
          <Plus className="w-4 h-4" /> Add slide
        </button>
      </div>
    </div>
  );
};

const TestimonialsEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  const updateItem = (idx, key, val) => {
    const items = [...(data.items || [])];
    items[idx] = { ...items[idx], [key]: val };
    setField('items', items);
  };
  const addItem = () => setField('items', [...(data.items || []), { quote: '', name: '', role: '', avatar_url: null, rating: 5 }]);
  const removeItem = (idx) => setField('items', (data.items || []).filter((_, i) => i !== idx));
  return (
    <div>
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Testimonials</label>
        {(data.items || []).map((item, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4 mb-3 bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase">Testimonial {idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <textarea placeholder="Quote text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y min-h-[80px] mb-2 focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.quote ?? ''} onChange={(e) => updateItem(idx, 'quote', e.target.value)} />
            <div className="flex gap-2">
              <input type="text" placeholder="Name" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.name ?? ''} onChange={(e) => updateItem(idx, 'name', e.target.value)} />
              <input type="text" placeholder="Role / Location" className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.role ?? ''} onChange={(e) => updateItem(idx, 'role', e.target.value)} />
              <input type="number" min="1" max="5" placeholder="Rating" className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" value={item.rating ?? 5} onChange={(e) => updateItem(idx, 'rating', Number(e.target.value))} />
            </div>
          </div>
        ))}
        <button onClick={addItem} className="flex items-center gap-1 text-sm text-primary hover:text-primary-700 mt-1">
          <Plus className="w-4 h-4" /> Add testimonial
        </button>
      </div>
    </div>
  );
};

const CtaEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div>
      <Field label="Title" value={data.title} onChange={(v) => setField('title', v)} />
      <Field label="Subtitle" value={data.subtitle} onChange={(v) => setField('subtitle', v)} textarea />
      <Field label="Button Label" value={data.button_label} onChange={(v) => setField('button_label', v)} />
      <Field label="Disclaimer (below button)" value={data.disclaimer} onChange={(v) => setField('disclaimer', v)} />
    </div>
  );
};

const FooterEditor = ({ data, onChange }) => {
  const setField = (key, val) => onChange({ ...data, [key]: val });
  return (
    <div>
      <Field label="Tagline" value={data.tagline} onChange={(v) => setField('tagline', v)} textarea />
      <Field label="Support Email" value={data.email} onChange={(v) => setField('email', v)} />
      <Field label="Phone Number" value={data.phone} onChange={(v) => setField('phone', v)} />
      <LinkListEditor label="Product Links" items={data.product_links} onChange={(v) => setField('product_links', v)} />
      <LinkListEditor label="Company Links" items={data.company_links} onChange={(v) => setField('company_links', v)} />
    </div>
  );
};

// Section registry
const SECTION_EDITORS = {
  nav:          { label: 'Navigation',      Editor: NavEditor },
  hero:         { label: 'Hero',            Editor: HeroEditor },
  why:          { label: 'Why Section',     Editor: WhyEditor },
  features:     { label: 'Features',        Editor: FeaturesEditor },
  personas:     { label: 'Personas',        Editor: PersonasEditor },
  how_it_works: { label: 'How It Works',    Editor: HowItWorksEditor },
  pricing:      { label: 'Pricing',         Editor: PricingEditor },
  demo_slider:  { label: 'Demo Slider',     Editor: DemoSliderEditor },
  testimonials: { label: 'Testimonials',    Editor: TestimonialsEditor },
  cta:          { label: 'Call To Action',  Editor: CtaEditor },
  footer:       { label: 'Footer',          Editor: FooterEditor },
};

const SECTION_ORDER = ['nav', 'hero', 'why', 'features', 'personas', 'how_it_works', 'pricing', 'demo_slider', 'testimonials', 'cta', 'footer'];

// ── Main page ──────────────────────────────────────────────────────────────────

const LandingPageEditor = () => {
  const { data: configResponse, isLoading } = useGetLandingConfigQuery();
  const [updateSection, { isLoading: isSaving }] = useUpdateLandingSectionMutation();
  const [resetSection, { isLoading: isResetting }] = useResetLandingSectionMutation();

  const [activeSection, setActiveSection] = useState('hero');
  // edits: only stores sections the user has modified locally (overrides server data)
  const [edits, setEdits] = useState({});

  // Merge server data with local edits — no useEffect needed
  const serverData = configResponse?.data || {};
  const localData = { ...serverData, ...edits };

  const sectionData = localData[activeSection] || {};
  const { Editor } = SECTION_EDITORS[activeSection] || {};

  const handleChange = (newData) => {
    setEdits((prev) => ({ ...prev, [activeSection]: newData }));
  };

  const handleSave = async () => {
    const { _updatedAt, ...payload } = sectionData;
    try {
      await updateSection({ section: activeSection, data: payload }).unwrap();
      // Clear local override — server data is now up-to-date
      setEdits((prev) => { const next = { ...prev }; delete next[activeSection]; return next; });
      toast.success('Section saved successfully');
    } catch {
      toast.error('Failed to save section');
    }
  };

  const handleReset = async () => {
    if (!window.confirm('Reset this section to built-in defaults? This cannot be undone.')) return;
    try {
      await resetSection(activeSection).unwrap();
      setEdits((prev) => { const next = { ...prev }; delete next[activeSection]; return next; });
      toast.success('Section reset to defaults');
    } catch {
      toast.error('Failed to reset section');
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-5 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Layout className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-gray-800 text-sm">Landing Page</h2>
          </div>
          <p className="text-xs text-gray-400 mt-1">Edit page sections</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {SECTION_ORDER.map((key) => {
            const { label } = SECTION_EDITORS[key];
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary font-semibold border-r-2 border-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {label}
                {isActive && <ChevronRight className="w-4 h-4" />}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Editor area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-bold text-gray-900 text-base">{SECTION_EDITORS[activeSection]?.label}</h1>
            <p className="text-xs text-gray-400 mt-0.5">Changes apply to the public landing page immediately after saving</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-primary rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Loading section data...</div>
          ) : Editor ? (
            <div className="max-w-2xl">
              <Editor data={sectionData} onChange={handleChange} />
            </div>
          ) : (
            <div className="text-gray-400 text-sm">No editor available for this section.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LandingPageEditor;
