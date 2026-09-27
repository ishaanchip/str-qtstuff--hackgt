import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getAccount, getUserEmail, logoutUser } from '../homeHelper'
import './HomeNav.css'

function HomeNav({ onLogout }) {
  const [firstName, setFirstName] = useState('')

  useEffect(() => {
    const email = getUserEmail()
    if (!email) return

    getAccount(email)
      .then(({ account }) => {
        setFirstName(account?.first_name || '')
      })
      .catch(() => {
        setFirstName('')
      })
  }, [])

  return (
    <div className="home-nav">
      <h2 className="home-nav__welcome">Welcome, {firstName || 'there'}</h2>
      <nav className="home-nav__links">
        <NavLink to="/your-pallete">Your Pallete</NavLink>
        <NavLink to="/clothe-me">Clothe Me</NavLink>
      </nav>
      <button
        type="button"
        className="home-nav__logout"
        onClick={() => {
          logoutUser()
          onLogout?.()
        }}
      >
        Log out
      </button>
    </div>
  )
}

export default HomeNav
