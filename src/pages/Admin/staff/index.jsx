import React from 'react'
import Btn from '../../../components/common/Button'

const StaffPage = () => {
  return (
    <div>
        <Btn type='primary' href={'/admin/view/all-staff'}>View All Staff</Btn>
    </div>
  )
}

export default StaffPage