import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getAccount, getUserEmail, logoutUser, USER_EMAIL_EVENT } from '../Home/homeHelper'
import WebcamRecorder from '../Home/Webcam/WebcamRecorder'
import '../Home/Webcam/WebcamRecorder.css'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => getUserEmail())
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [refImg, setRefImg] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [changingPicture, setChangingPicture] = useState(false)

  useEffect(() => {
    const syncEmail = () => {
      const nextEmail = getUserEmail()
      setEmail(nextEmail)
      if (!nextEmail) setMenuOpen(false)
    }
    window.addEventListener(USER_EMAIL_EVENT, syncEmail)
    return () => window.removeEventListener(USER_EMAIL_EVENT, syncEmail)
  }, [])

  useEffect(() => {
    if (!email) {
      setFirstName('')
      setLastName('')
      setRefImg('')
      return
    }

    getAccount(email)
      .then(({ account }) => {
        setFirstName(account?.first_name || '')
        setLastName(account?.last_name || '')
        setRefImg(account?.ref_img || '')
      })
      .catch(() => {
        setFirstName('')
        setLastName('')
        setRefImg('')
      })
  }, [email])

  const handleLogout = () => {
    logoutUser()
    setMenuOpen(false)
    navigate('/')
  }

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || 'Account'
  const initial = (firstName || email || 'A').charAt(0).toUpperCase()

  return (
    <header className="header">
      <NavLink to="/" className="header__title">grwm</NavLink>

      {email && (
        <nav className="header-nav">
          <NavLink to="/clothe-me">Clothe Me</NavLink>
          <NavLink to="/your-pallete">Your Pallete</NavLink>
        </nav>
      )}

      {email && (
        <div className="header__account-wrap">
          <button
            type="button"
            className="header__account"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
          >
            {firstName || 'Account'}
          </button>

          {menuOpen && (
            <>
              <div className="header-menu__backdrop" onClick={() => setMenuOpen(false)} />
              <div className="header-menu" role="menu">
                <div className="header-menu__profile">
                  <div className="header-menu__avatar">
                    {refImg ? (
                      <img src={refImg} alt="" className="header-menu__avatar-img" />
                    ) : (
                      initial
                    )}
                  </div>
                  <div>
                    <p className="header-menu__name">{displayName}</p>
                    <p className="header-menu__email">{email}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="header-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setChangingPicture(true)
                  }}
                >
                  Change picture
                </button>
                <button
                  type="button"
                  className="header-menu__item"
                  role="menuitem"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {changingPicture && (
        <div className="signup-modal">
          <div className="header-change-picture">
            <button
              type="button"
              className="signup-panel__close"
              onClick={() => setChangingPicture(false)}
              aria-label="Close"
            >
              ×
            </button>
            <WebcamRecorder
              mode="change-picture"
              onImageUpdated={(image) => {
                setRefImg(image)
                setChangingPicture(false)
              }}
            />
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
