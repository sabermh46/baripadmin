//a small rounded chevron left icon button to navigate back
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
const NavigateBack = ({ to }) => {
    const {t} = useTranslation();
  const navigate = useNavigate();
    return (
    <button
    title={t('go_back')}
      onClick={() => {
        if (to) {
            navigate(to);
        } else {
            navigate(-1);
        }
        }}
        className="p-2 text-subdued font-black text-sm flex gap-2 items-center cursor-pointer rounded-full bg-slate-100 hover:bg-primary-200/50 transition-colors"
    >
      <ChevronLeft size={20} /> {t('go_back')}
    </button>
  );
};
export default NavigateBack;