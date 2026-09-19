import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { iosGuide1, iosGuide2, iosGuide3, iosGuide4 } from '../../assets';

/**
 * iOS never fires `beforeinstallprompt`, so there is no dialog to trigger — the only way onto
 * the home screen is Safari's own Share sheet. This walks through it a screenshot at a time
 * rather than describing it in prose, because the step that actually loses people ("View
 * More" in the share sheet, then "Open as Web App") is buried two taps deep and is easier to
 * recognise than to read.
 */
const STEPS = [
  { image: iosGuide1, key: 'ios_install_step_1' },
  { image: iosGuide2, key: 'ios_install_step_2' },
  { image: iosGuide3, key: 'ios_install_step_3' },
  { image: iosGuide4, key: 'ios_install_step_4' },
];

const IosInstallGuide = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);

  // Start from the top each time it is opened, not from wherever it was left last time.
  // Adjusted during render rather than in an effect: an effect would reset after painting
  // the old step, and resetting on close would rewind visibly behind the fade-out.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setStep(0);
  }

  const isLast = step === STEPS.length - 1;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="sm"
      title={t('install_on_iphone')}
      subtitle={t('ios_install_intro')}
      className="pb-[env(safe-area-inset-bottom)]"
    >
      <div className="space-y-4">
        <p className="flex items-start gap-2 text-sm text-gray-700">
          <span className="shrink-0 grid place-items-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
            {step + 1}
          </span>
          {t(STEPS[step].key)}
        </p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 overflow-hidden">
          {/* Only the visible step is decoded, but all four are in the DOM so stepping
              forward does not flash an empty frame while the next screenshot loads. */}
          {STEPS.map((s, i) => (
            <img
              key={s.key}
              src={s.image}
              alt={t(s.key)}
              loading={i === 0 ? 'eager' : 'lazy'}
              className={`w-full max-h-[50vh] object-contain ${i === step ? 'block' : 'hidden'}`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" />
            {t('previous')}
          </button>

          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setStep(i)}
                aria-label={t('step_n', { n: i + 1 })}
                aria-current={i === step}
                className={`h-2 rounded-full transition-all ${i === step ? 'w-5 bg-primary' : 'w-2 bg-gray-300'}`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"
            >
              <Check className="h-4 w-4" />
              {t('done')}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90"
            >
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default IosInstallGuide;
