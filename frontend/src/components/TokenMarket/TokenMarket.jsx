import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FaCoins } from 'react-icons/fa'
import { getUserEmail, notifyTokensChanged } from '../Home/homeHelper'
import { createCheckoutSession, fulfillCheckout, TOKEN_PACKS } from './tokenMarketHelper'
import './TokenMarket.css'

function TokenMarket() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [buyingId, setBuyingId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    const canceled = searchParams.get('canceled')

    if (canceled) {
      setError('Payment was canceled.')
      setSearchParams({}, { replace: true })
      return
    }

    if (!sessionId) return

    fulfillCheckout(sessionId)
      .then((data) => {
        notifyTokensChanged(data.tokens ?? data.account?.tokens)
        setError('')
        setMessage(
          data.alreadyFulfilled
            ? 'Payment already applied to your account.'
            : 'Payment complete. Tokens were added to your account.'
        )
      })
      .catch((err) => {
        setMessage('')
        setError(err.response?.data?.error || err.message || 'Could not confirm payment.')
      })
      .finally(() => {
        setSearchParams({}, { replace: true })
      })
  }, [searchParams, setSearchParams])

  const handleBuy = async (pack) => {
    const email = getUserEmail()
    if (!email) {
      setError('Log in to buy tokens.')
      setMessage('')
      return
    }

    setBuyingId(pack.id)
    setError('')
    setMessage('')
    try {
      const { url } = await createCheckoutSession(email, pack.id)
      if (!url) {
        throw new Error('Stripe did not return a checkout URL.')
      }
      window.location.assign(url)
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Could not start checkout.')
      setBuyingId('')
    }
  }

  return (
    <main className="token-market">
      <header className="token-market__intro">
        <p className="studio-eyebrow">YOUR PERSONAL STYLING STUDIO</p>
        <h1 className="token-market__title">Choose a token pack and keep exploring your style.</h1>
      </header>
      {error && <p role="alert" className="token-market__status token-market__status--error">{error}</p>}
      {message && <p role="status" className="token-market__status">{message}</p>}

      <div className="token-market__grid">
        {TOKEN_PACKS.map((pack) => (
          <article key={pack.id} className="token-pack">
            {pack.bonus && <p className="token-pack__bonus">{pack.bonus}% bonus</p>}
            <div className="token-pack__body">
              <div className={`token-pack__coins token-pack__coins--${pack.id}`} aria-hidden="true">
                {Array.from({ length: pack.stack }).map((_, index) => (
                  <FaCoins key={index} className="token-pack__icon" />
                ))}
              </div>
              <p className="token-pack__amount">{pack.tokens.toLocaleString()}</p>
              <p className="token-pack__label">tokens</p>
            </div>
            <button
              type="button"
              className="token-pack__price"
              onClick={() => handleBuy(pack)}
              disabled={Boolean(buyingId)}
            >
              {buyingId === pack.id ? 'Redirecting…' : `Buy for $${pack.price}`}
            </button>
          </article>
        ))}
      </div>
    </main>
  )
}

export default TokenMarket
