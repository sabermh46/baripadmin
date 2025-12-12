

import React from 'react'
import { useAuth } from '../../hooks'
import Btn from '../../components/common/Button';

const WebOwnerDashboard = () => {

    const { user } = useAuth();

  return (
    <div>
        <h2 className='font-bold font-mooli text-2xl text-slate-600'>
            Hello, <span className='text-primary'>{ user?.name }! </span> <br /> 
            <h3 className='font-poppins text-xl'> Welcome to your Dashboard.</h3>
        </h2>

        <div className="flex flex-wrap">
            <SmallCard title="Generate Invitation Link" children={
                <Btn type='primary' href={'/admin/generate-token'}>Generate Link</Btn>
            } />
        </div>

    </div>
  )
}

export default WebOwnerDashboard


const SmallCard = ({ title, children }) => {
    return (
        <div className='mt-6 p-4 bg-white rounded-lg shadow-md'>
            <h3 className='font-semibold text-lg text-slate-700 mb-2'>{title}</h3>
            {children}
        </div>
    )
}