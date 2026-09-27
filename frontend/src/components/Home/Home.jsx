import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { checkAccount, clearUserEmail, getUserEmail, isLoggedIn, USER_EMAIL_EVENT } from './homeHelper'
import './Home.css'
import WebcamRecorder from './Webcam/WebcamRecorder'

const FLOAT_WORDS = [
  { text: 'Find new outfits', className: 'home__float--1' },
  { text: 'Clothe me', className: 'home__float--2' },
  { text: 'Best colors', className: 'home__float--3' },
  { text: 'Try it on', className: 'home__float--4' },
  { text: 'Get ready', className: 'home__float--5' },
  { text: 'Your closet', className: 'home__float--6' },
  { text: 'Mix & match', className: 'home__float--7' },
  { text: 'Daily fit', className: 'home__float--8' },
  { text: 'Style you', className: 'home__float--9' },
  { text: 'Outfit inspo', className: 'home__float--10' },
  { text: 'Fit check', className: 'home__float--11' },
  { text: 'GRWM', className: 'home__float--12' },
  { text: 'Today\'s look', className: 'home__float--13' },
  { text: 'New look', className: 'home__float--14' },
  { text: 'Mirror check', className: 'home__float--15' },
  { text: 'Get ready with me', className: 'home__float--16' },
]

function Home() {
  const [loggedIn, setLoggedIn] = useState(() => isLoggedIn())

  useEffect(() => {
    const syncSession = () => {
      const email = getUserEmail()
      if (!email) {
        setLoggedIn(false)
        return
      }

      checkAccount(email)
        .then(({ exists }) => {
          if (exists) {
            setLoggedIn(true)
            return
          }
          clearUserEmail()
          setLoggedIn(false)
        })
        .catch(() => {
          setLoggedIn(true)
        })
    }

    syncSession()
    window.addEventListener(USER_EMAIL_EVENT, syncSession)
    return () => window.removeEventListener(USER_EMAIL_EVENT, syncSession)
  }, [])

  if (loggedIn) {
    return <Navigate to="/clothe-me" replace />
  }

  return (
    <div className="home">
      <div className="home__stage">
        {FLOAT_WORDS.map((word) => (
          <span key={word.className} className={`home__float ${word.className}`}>
            {word.text}
          </span>
        ))}
        <div className="home__camera">
          <WebcamRecorder
            onSnapshot={(img, t) => console.log("snapshot at", t, "ms")}
            onAccount={(accountString) => console.log(accountString)}
            onSessionStart={(email) => {
              if (email) setLoggedIn(true)
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default Home
