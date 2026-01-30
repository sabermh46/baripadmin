import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, Construction, ArrowLeft, BellRing } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Btn from '../../components/common/Button';

const ComingSoonPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4">
      {/* Background Decor */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[10%] right-[5%] w-96 h-96 bg-slate-200/50 rounded-full blur-3xl" />
      </div>

      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Icon/Illustration Area */}
        <div className="relative inline-block">
          <div className="p-6 bg-white rounded-3xl shadow-xl border border-slate-100">
            <Construction className="h-16 w-16 text-primary animate-bounce" />
          </div>
          <div className="absolute -top-2 -right-2">
            <span className="flex h-6 w-6">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-6 w-6 bg-primary"></span>
            </span>
          </div>
        </div>

        {/* Text Content */}
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 font-oswald tracking-tight">
            {t('coming_soon')}
          </h1>
          <p className="text-lg text-slate-600 font-mooli max-w-lg mx-auto">
            {t('this_feature_is_currently_under_development_please_check_back_later')}
          </p>
        </div>

        {/* Progress Bar (Visual only) */}
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between text-sm font-medium text-slate-500">
            <span>{t('development_progress')}</span>
            <span>75%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full w-[75%] transition-all duration-1000"></div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Btn 
            type="primary" 
            className="flex items-center gap-2 px-8"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('go_back')}
          </Btn>

        </div>

        {/* Branding Footer */}
        <div className="pt-12 flex items-center justify-center gap-2 text-slate-400">
          <Home className="h-5 w-5" />
          <span className="text-sm font-semibold uppercase tracking-widest">Bari Porichalona</span>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;