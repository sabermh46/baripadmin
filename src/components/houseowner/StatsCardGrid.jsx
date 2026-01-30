import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function StatsCardGrid({ stats = [] }) {
  const [isClicked, setIsClicked] = useState({});
  console.log(isClicked);
  const {t} = useTranslation();
  
  return (
    <div className="grid grid-cols-4 gap-2 mt-3 font-mooli">
      {stats.map(({ label, value, icon: Icon, hover }, idx) =>
        {
          return (
            <div
              key={idx}
              onClick={()=>setIsClicked(hover)}
              className={`relative flex flex-col items-center justify-center text-center bg-primary-100/20 border border-primary-200 rounded-sm py-2 px-1 shadow-sm
                ${idx === 0 ? 'rounded-tl-xl rounded-bl-xl' : ''} ${idx === stats.length -1 ? 'rounded-tr-xl rounded-br-xl' : ''  }`}
            >
              <div className="w-12 h-12 mb-2 flex items-center justify-center">
                <img className="w-10 h-10" src={Icon} />
              </div>
              <p className="text-[0.7rem] sm:text-sm text-text/90 font-bold h-10 md:text-sm text-wrap font-roboto flex items-center justify-center">
                {label}
              </p>
              <p className="text-2xl font-bold text-black/70 mt-1 text-shadow-lg/7 font-poppins">
                {value}
              </p>
            </div>
          )}
      )}

        {Object.keys(isClicked).length !== 0 && (
          <div
            onClick={(e)=>{
              setIsClicked({});
            }}
              className={` ${Object.keys(isClicked).length !== 0 ? 'fixed' : 'hidden'} inset-0 bg-black/55 backdrop-blur-sm transition-opacity flex justify-center items-center overflow-y-auto z-20`}>
              <div className="flex flex-wrap gap-4 bg-white p-6 rounded-lg shadow-lg max-w-3xl">
                {
                  isClicked?.cardFor === "houses" &&isClicked?.data.map((item, index)=>(
                    <Link to={'/houses/' + item.id} key={index} className="p-4 border border-gray-400 rounded-lg hover:shadow-md transition-shadow">
                      <p className="font-medium text-text mb-2 font-roboto">{item.name}</p>
                      <p className="text-sm text-subdued">
                        {t('flats')}: {item?.flats?.length || 0}
                      </p>
                    </Link>
                  ))
                }

                {
                  isClicked?.cardFor === "flats" && (
                    <div className="flex flex-col">
                      {
                        isClicked?.data.map((item, index)=>(
                          <div>
                            <p key={index} className="font-medium text-text mb-2 font-roboto">{item.name}</p>
                            <div className="flex gap-2 flex-wrap">
                              {
                                item.flats?.map((flat, idx)=>{
                                  const isVacant = !flat.renter_id;
                                  return (
                                    <Link to={'/flats/' + flat.id} key={idx} className={`p-3 rounded-lg mb-2 hover:shadow-md transition-shadow relative block border border-gray-500 z-10`}>
                                      {
                                        isVacant && (
                                          <span className="text-[0.6rem] w-full text-center font-poppins text-white px-1 rounded-lg rounded-b-none block absolute -z-10 top-0 bg-red-500 left-1/2 -translate-x-1/2">{t('vacant')}</span>
                                        )
                                      }
                                      <p className="font-medium text-text">{flat.name}</p>
                                      <p className="font-google-sans-code text-xs">{flat.number}</p>
                                    </Link>
                                  )
                                })
                              }
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )
                }

                {
                  isClicked?.cardFor === "renters" && isClicked?.data.map((item, index)=>(
                    <Link to={'/renters/?view=' + item.id} key={index} className="p-4 border border-gray-400 rounded-lg hover:shadow-md transition-shadow">
                      <p className="font-medium text-text mb-2 font-roboto">{item.name}</p>
                      <p className="text-sm text-subdued">
                        {t('flats')}: {item.flat_number || 'N/A'}
                      </p>
                    </Link>
                  ))
                }

                {/* caretakers/9/details */}
                {
                  isClicked?.cardFor === "caretakers" && isClicked?.data.map((item, index)=>(
                    <Link to={'/caretakers/' + item.id + '/details'} key={index} className="p-4 border border-gray-400 rounded-lg hover:shadow-md transition-shadow">
                      <p className="font-medium text-text mb-2 font-roboto">{item.name}</p>
                    </Link>
                  ))
                }



              </div>
          </div>
        )}
    </div>
  );
}
