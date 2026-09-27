import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { getAccount, getUserEmail, logoutUser, USER_EMAIL_EVENT, USER_TOKENS_EVENT } from '../Home/homeHelper'
import WebcamRecorder from '../Home/Webcam/WebcamRecorder'
import '../Home/Webcam/WebcamRecorder.css'
import './Header.css'

function Header() {
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => getUserEmail())
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [refImg, setRefImg] = useState('')
  const [tokens, setTokens] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [changingPicture, setChangingPicture] = useState(false)

  useEffect(() => {
    const syncEmail = () => {
      const nextEmail = getUserEmail()
      setEmail(nextEmail)
      if (!nextEmail) setMenuOpen(false)
    }
    const syncTokens = (event) => {
      if (typeof event.detail?.tokens === 'number') {
        setTokens(event.detail.tokens)
      }
    }

    window.addEventListener(USER_EMAIL_EVENT, syncEmail)
    window.addEventListener(USER_TOKENS_EVENT, syncTokens)
    return () => {
      window.removeEventListener(USER_EMAIL_EVENT, syncEmail)
      window.removeEventListener(USER_TOKENS_EVENT, syncTokens)
    }
  }, [])

  useEffect(() => {
    if (!email) {
      setFirstName('')
      setLastName('')
      setRefImg('')
      setTokens(null)
      return
    }

    getAccount(email)
      .then(({ account }) => {
        setFirstName(account?.first_name || '')
        setLastName(account?.last_name || '')
        setRefImg(account?.ref_img || '')
        setTokens(account?.tokens ?? 5000)
      })
      .catch(() => {
        setFirstName('')
        setLastName('')
        setRefImg('')
        setTokens(null)
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
      <NavLink to="/" className="header__title">grwm.</NavLink>

      {email && (
        <nav className="header-nav" aria-label="Main navigation">
          <NavLink to="/clothe-me">Clothe Me</NavLink>
          <NavLink to="/token-market">Token Market</NavLink>
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
            <span className="header__initial" aria-hidden="true">{initial}</span>
            <span className="header__account-name">{firstName || 'Account'}</span>
            <svg className={`header__chevron${menuOpen ? ' header__chevron--open' : ''}`} width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
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
                    <p className="header-menu__tokens">{tokens ?? 0} tokens</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="header-menu__item"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/token-market')
                  }}
                >
                  Token Market
                </button>
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
