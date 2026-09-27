import { useEffect, useRef, useState } from 'react'
import { createDecartClient, models } from '@decartai/sdk'
import { getAccount, getUserEmail, notifyTokensChanged } from '../Home/homeHelper'
import { formatPrice, getBestColors, searchClothes, tryOn } from './clotheMeHelper'
import './ClotheMe.css'

const INITIAL_SECTIONS = [
  {
    id: 'tops',
    title: 'Tops',
    items: [

    ],
  },
  {
    id: 'bottoms',
    title: 'Bottoms',
    items: [

    ],
  },
  {
    id: 'accessories',
    title: 'Accessories',
    items: [

    ],
  },
]

function ClotheMe() {
  const [sections, setSections] = useState(INITIAL_SECTIONS)
  const [tokens, setTokens] = useState(null)
  const [tryOnError, setTryOnError] = useState('')
  const [tryingOn, setTryingOn] = useState(false)
  const [bestColors, setBestColors] = useState([])
  const [gender, setGender] = useState('male')
  const [selectedColor, setSelectedColor] = useState('')
  const [searchingColor, setSearchingColor] = useState(false)
  const [searchResults, setSearchResults] = useState({
    tops: [],
    bottoms: [],
    accessories: [],
  })
  const [searchMiss, setSearchMiss] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [stagedItem, setStagedItem] = useState(null)
  const [liveOn, setLiveOn] = useState(false)
  const stageVideoRef = useRef(null)
  const liveSessionRef = useRef({ realtime: null, stream: null })

  const stopLiveTryOn = () => {
    liveSessionRef.current.realtime?.disconnect?.()
    liveSessionRef.current.stream?.getTracks?.().forEach((track) => track.stop())
    liveSessionRef.current = { realtime: null, stream: null }
    if (stageVideoRef.current) {
      stageVideoRef.current.srcObject = null
    }
    setLiveOn(false)
  }

  useEffect(() => {
    const email = getUserEmail()
    if (!email) return

    getAccount(email)
      .then(({ account }) => {
        setGender(account?.gender === 'female' ? 'female' : 'male')
        const nextTokens = account?.tokens ?? 5000
        setTokens(nextTokens)
        notifyTokensChanged(nextTokens)
        setBestColors(getBestColors(account?.color_palette))
      })
      .catch(() => {})
  }, [])

  useEffect(() => () => stopLiveTryOn(), [])

  const handleTryOn = async () => {
    const email = getUserEmail()
    if (!email) {
      setTryOnError('Log in to try on an outfit.')
      return
    }

    const garments = sections.flatMap((section) =>
      section.items.map((item) => ({
        name: item.name,
        image: item.image,
        category: section.id,
      }))
    )
    if (!garments.length) {
      setTryOnError('Add a top, bottom, or accessory first.')
      return
    }

    stopLiveTryOn()
    setTryingOn(true)
    setTryOnError('')
    try {
      const model = models.realtime('lucy-2.5')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          frameRate: model.fps,
          width: model.width,
          height: model.height,
        },
      })
      liveSessionRef.current.stream = stream
      if (stageVideoRef.current) {
        stageVideoRef.current.srcObject = stream
      }
      setStagedItem(null)
      setLiveOn(true)

      const data = await tryOn(email, garments)
      setTokens(data.tokens ?? data.account?.tokens ?? 0)

      if (!data.apiKey) {
        throw new Error('Could not start live try-on.')
      }

      const client = createDecartClient({ apiKey: data.apiKey })
      const realtime = await client.realtime.connect(stream, {
        model,
        mirror: true,
        onRemoteStream: (transformedStream) => {
          if (stageVideoRef.current) {
            stageVideoRef.current.srcObject = transformedStream
          }
        },
        initialState: {
          prompt: {
            text: data.prompt,
            enhance: true,
          },
          ...(data.referenceImage ? { image: data.referenceImage } : {}),
        },
      })
      liveSessionRef.current.realtime = realtime
      setStagedItem(null)
      setLiveOn(true)
    } catch (err) {
      stopLiveTryOn()
      if (typeof err.response?.data?.tokens === 'number') {
        setTokens(err.response.data.tokens)
        notifyTokensChanged(err.response.data.tokens)
      }
      setTryOnError(err.response?.data?.error || err.message || 'Could not try on.')
    } finally {
      setTryingOn(false)
    }
  }

  const handleColorClick = async (color) => {
    setSelectedColor(color.name)
    setSearchingColor(true)
    setSearchMiss(false)
    setSearchError('')
    try {
      const clothes = await searchClothes({
        colors: [color.name],
        amountOfClothes: 10,
        gender,
      })
      setSearchResults(clothes)
      const total =
        (clothes.tops?.length || 0) +
        (clothes.bottoms?.length || 0) +
        (clothes.accessories?.length || 0)
      setSearchMiss(total === 0)
    } catch (err) {
      setSearchResults({ tops: [], bottoms: [], accessories: [] })
      setSearchError(err.response?.data?.error || 'We couldn’t load clothes. Please try this color again.')
    } finally {
      setSearchingColor(false)
    }
  }

  const addToOutfit = (sectionId, item) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                {
                  id: `${sectionId}-${item.affiliate || item.name}`,
                  name: item.name,
                  image: item.image,
                  affiliate: item.affiliate,
                  price: item.price,
                },
              ],
            }
          : section
      )
    )
  }

  const removeItem = (sectionId, itemId) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
          : section
      )
    )
  }

  const isInOutfit = (sectionId, item) =>
    sections
      .find((section) => section.id === sectionId)
      ?.items.some(
        (picked) =>
          picked.affiliate === item.affiliate && picked.name === item.name
      )

  return (
    <main className="clothe-me">
      <div className="clothe-me__intro"><p className="studio-eyebrow">YOUR PERSONAL STYLING STUDIO</p><h1>A look that feels like you.</h1><p>Explore your colors, find your pieces, and try it all together.</p></div>
      <section className="clothe-me__left" aria-label="Your outfit preview">
        <h2 className="studio-step">03 <span>Try your outfit</span></h2>
        <div className="clothe-me__stage">
          <video
            ref={stageVideoRef}
            className={`clothe-me__stage-video${liveOn ? ' clothe-me__stage-video--on' : ''}`}
            autoPlay
            playsInline
            muted
          />
          {liveOn ? (
            <p className="clothe-me__stage-live">Live try-on</p>
          ) : stagedItem ? (
            <>
              <div className="clothe-me__stage-media">
                {stagedItem.image ? (
                  <img src={stagedItem.image} alt={stagedItem.name || 'Selected item'} />
                ) : (
                  <span className="clothe-me__stage-fallback">
                    {(stagedItem.name || 'I').charAt(0)}
                  </span>
                )}
              </div>
              {stagedItem.affiliate && (
                <a
                  href={stagedItem.affiliate}
                  target="_blank"
                  rel="noreferrer"
                  className="clothe-me__stage-link"
                >
                  View product
                </a>
              )}
            </>
          ) : (
            <div className="clothe-me__stage-media">
              <div className="clothe-me__stage-placeholder">
                <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
                  <path d="M24 12c0 8 16 8 16 0l14 8-7 13-7-4v25H24V29l-7 4-7-13 14-8Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                </svg>
                <p>Add your favorite pieces here!</p>
              </div>
            </div>
          )}
        </div>

        <div className="clothe-me__outfit-wrap">
          <article className="clothe-me__outfit">
            <div className="clothe-me__sections">
              {sections.map((section) => (
                <div key={section.id} className="clothe-me__section">
                  <h3 className="clothe-me__section-title">{section.title}</h3>
                  <ul className="clothe-me__items">
                    {!section.items.length && <li className="clothe-me__slot-empty">Choose a piece below</li>}
                    {section.items.map((item) => (
                      <li key={item.id} className="clothe-me__item clothe-me__item--slot">
                        <div className="clothe-me__slot-media">
                          {item.image ? (
                            <img src={item.image} alt={item.name || ''} className="clothe-me__slot-img" />
                          ) : (
                            <span className="clothe-me__slot-img clothe-me__item-img--empty">
                              {(item.name || 'Y').charAt(0)}
                            </span>
                          )}
                          <button
                            type="button"
                            className="clothe-me__item-remove"
                            onClick={() => removeItem(section.id, item.id)}
                            aria-label={`Remove ${item.name}`}
                          >
                            ×
                          </button>
                        </div>
                        {item.affiliate && (
                          <a
                            href={item.affiliate}
                            target="_blank"
                            rel="noreferrer"
                            className="clothe-me__item-link"
                          >
                            View product
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>
          <div className="clothe-me__try-on-wrap">
            {tryOnError && <p className="clothe-me__try-on-error">{tryOnError}</p>}
            <button
              type="button"
              className="clothe-me__try-on"
              onClick={handleTryOn}
              disabled={tryingOn || (tokens != null && tokens < 1000)}
            >
              {tryingOn ? 'Starting live try-on…' : 'Try on outfit'}
            </button>
            <p className="clothe-me__tokens">1,000 tokens per try-on · Balance: {tokens ?? 0}</p>
          </div>
        </div>
      </section>

      <section className="clothe-me__right" aria-label="Colors and clothing">
        <div className="clothe-me__palette">
          <h3 className="clothe-me__palette-title">
            <span className="studio-step">01 <span>Your colors</span></span>
          </h3>
          <p className="clothe-me__hint">Choose a color to find your next favorite piece.</p>
          {bestColors.length ? (
            <ul className="clothe-me__palette-list">
              {bestColors.map((color) => {
                const match = typeof color.score === 'number' && Number.isFinite(color.score)
                  ? Math.round(Math.min(100, Math.max(0, color.score)))
                  : null
                return (
                <li
                  key={`${color.name}-${color.hex}`}
                  className={`clothe-me__color${selectedColor === color.name ? ' clothe-me__color--selected' : ''}`}
                >
                  <button type="button" className="clothe-me__color-button" aria-pressed={selectedColor === color.name} disabled={searchingColor} onClick={() => handleColorClick(color)}
                >
                  <span className="clothe-me__color-heading"><span className="clothe-me__swatch" style={{ backgroundColor: color.hex }} /><span className="clothe-me__color-name">{color.name}</span></span>
                  <span
                    className="clothe-me__color-track"
                    role={match == null ? undefined : 'meter'}
                    aria-label={`${color.name} match`}
                    aria-valuemin={match == null ? undefined : 0}
                    aria-valuemax={match == null ? undefined : 100}
                    aria-valuenow={match ?? undefined}
                    aria-valuetext={match == null ? undefined : `${match}% match`}
                  >
                    <span
                      className="clothe-me__color-mark"
                      style={{ backgroundColor: color.hex, width: `${match ?? 0}%` }}
                    />
                  </span>
                  <p className="clothe-me__color-hex">
                    {match == null ? 'Match unavailable' : `${match}% match`}
                  </p>
                  </button>
                </li>
                )
              })}
            </ul>
          ) : (
            <p className="clothe-me__palette-empty">
              Take or update your photo to generate a palette.
            </p>
          )}
        </div>
        <div className="clothe-me__preview" aria-busy={searchingColor}>
          <h2 className="studio-step">02 <span>Find clothes</span></h2>
          {searchingColor ? (
            <div role="status"><p className="clothe-me__hint">Finding pieces in {selectedColor}…</p><div className="clothe-me__skeleton-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="clothe-me__skeleton" aria-hidden="true" />)}</div></div>
          ) : searchError ? (
            <div role="alert" className="clothe-me__search-error"><p>{searchError}</p><button type="button" onClick={() => handleColorClick({ name: selectedColor })}>Try again</button></div>
          ) : searchMiss ? (
            <p className="clothe-me__preview-empty">
              No pieces found in {selectedColor || 'this color'} yet. Try another color from your palette.
            </p>
          ) : (
            [
              { id: 'tops', title: 'Tops', items: searchResults.tops },
              { id: 'bottoms', title: 'Bottoms', items: searchResults.bottoms },
              { id: 'accessories', title: 'Accessories', items: searchResults.accessories },
            ].map((row) => (
              <div key={row.id} className="clothe-me__preview-section">
                <h3 className="clothe-me__section-title">{row.title}</h3>
                <ul className="clothe-me__preview-row" tabIndex={0} aria-label={`${row.title} options`}>
                  {row.items.length ? (
                    row.items.map((item, index) => {
                      const price = formatPrice(item.price)
                      const picked = isInOutfit(row.id, item)
                      return (
                      <li
                        key={`${row.id}-${index}-${item.affiliate || item.name}`}
                        className="clothe-me__result"
                      >
                        <button
                          type="button"
                          className={`clothe-me__item clothe-me__item--pick${
                            stagedItem &&
                            stagedItem.affiliate === item.affiliate &&
                            stagedItem.name === item.name
                              ? ' clothe-me__item--staged'
                              : ''
                          }`}
                          onClick={() => setStagedItem(item)}
                        >
                        {item.image ? (
                          <img src={item.image} alt="" className="clothe-me__item-img" />
                        ) : (
                          <span className="clothe-me__item-img clothe-me__item-img--empty">
                            {(item.name || 'I').charAt(0)}
                          </span>
                        )}
                        <div className="clothe-me__item-copy">
                          <span className="clothe-me__item-name">{item.name}</span>
                          {price && <span className="clothe-me__item-price">{price}</span>}
                        </div>
                        </button>
                          {item.affiliate && (
                            <a
                              href={item.affiliate}
                              target="_blank"
                              rel="noreferrer"
                              className="clothe-me__item-link"
                            >
                              View product
                            </a>
                          )}
                        <button
                          type="button"
                          className={`clothe-me__item-add${picked ? ' clothe-me__item-add--on' : ''}`}
                          onClick={() => addToOutfit(row.id, item)}
                          aria-label={picked ? `Replace ${row.title} with ${item.name}` : `Add ${item.name}`}
                        >
                          {picked ? 'Added to outfit' : 'Add to outfit'}
                        </button>
                      </li>
                      )
                    })
                  ) : (
                    <li className="clothe-me__preview-empty">
                      {selectedColor ? 'No pieces in this category. Try another color.' : 'Select a color above to discover pieces.'}
                    </li>
                  )}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}

export default ClotheMe
