import styels from "./styles.module.css"

import React from 'react'

const HomePage = ({userDetails}) => {
    console.log(userDetails);
    
    const user = userDetails;
    const logout = ()=> {
        window.open(
            `${import.meta.env.VITE_APP_API_URL}/auth/logout`,
            "_self"
        )
    }

  return (
    <div>
        <h1>Home Page</h1>

        <input defaultValue={user.name} type="text" />
        <input defaultValue={user.email} type="text" />

        <button onClick={logout}>
            Logout
        </button>

    </div>
  )
}

export default HomePage