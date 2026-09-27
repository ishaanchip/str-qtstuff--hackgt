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
  const [profile, setProfile] = useState({ name: 'You', img: '' })
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
        const name = [account?.first_name, account?.last_name].filter(Boolean).join(' ')
        setProfile({
          name: name || 'You',
          img: account?.ref_img || '',
        })
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
    try {
      const clothes = await searchClothes({
        colors: [color.name],
        amountOfClothes: 3,
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
      setSearchMiss(true)
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
    <div className="clothe-me">
      <section className="clothe-me__left" aria-label="Outfit options">
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
          ) : null}
        </div>

        <div className="clothe-me__outfit-wrap">
          <article className="clothe-me__outfit">
            <div className="clothe-me__sections">
              {sections.map((section) => (
                <div key={section.id} className="clothe-me__section">
                  <h3 className="clothe-me__section-title">{section.title}</h3>
                  <ul className="clothe-me__items">
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
              {tryingOn ? 'Starting live try-on…' : 'Try on | 1000 Tokens'}
            </button>
            <p className="clothe-me__tokens">Account Balance: {tokens ?? 0} tokens</p>
          </div>
        </div>
      </section>

      <section className="clothe-me__right" aria-label="Try on preview">
        <div className="clothe-me__palette">
          <h3 className="clothe-me__palette-title">
            {searchingColor ? 'Finding clothes…' : 'Best colors'}
          </h3>
          {bestColors.length ? (
            <ul className="clothe-me__palette-list">
              {bestColors.map((color) => (
                <li
                  key={`${color.name}-${color.hex}`}
                  className={`clothe-me__color${selectedColor === color.name ? ' clothe-me__color--selected' : ''}`}
                  onClick={() => handleColorClick(color)}
                >
                  <p className="clothe-me__color-name">{color.name}</p>
                  <span
                    className="clothe-me__color-mark"
                    style={{ backgroundColor: color.hex }}
                    aria-hidden="true"
                  />
                  <p className="clothe-me__color-hex">{color.hex}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="clothe-me__palette-empty">
              Take or update your photo to generate a palette.
            </p>
          )}
        </div>
        <div className="clothe-me__preview">
          {searchMiss ? (
            <p className="clothe-me__preview-empty">
              Could not find any matches for {selectedColor || 'color'}
            </p>
          ) : (
            [
              { id: 'tops', title: 'Tops', items: searchResults.tops },
              { id: 'bottoms', title: 'Bottoms', items: searchResults.bottoms },
              { id: 'accessories', title: 'Accessories', items: searchResults.accessories },
            ].map((row) => (
              <div key={row.id} className="clothe-me__preview-section">
                <h3 className="clothe-me__section-title">{row.title}</h3>
                <ul className="clothe-me__preview-row">
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
                          {item.affiliate && (
                            <a
                              href={item.affiliate}
                              target="_blank"
                              rel="noreferrer"
                              className="clothe-me__item-link"
                              onClick={(event) => event.stopPropagation()}
                            >
                              View product
                            </a>
                          )}
                        </div>
                        </button>
                        <button
                          type="button"
                          className={`clothe-me__item-add${picked ? ' clothe-me__item-add--on' : ''}`}
                          onClick={() => addToOutfit(row.id, item)}
                          aria-label={picked ? `Replace ${row.title} with ${item.name}` : `Add ${item.name}`}
                        >
                          +
                        </button>
                      </li>
                      )
                    })
                  ) : (
                    <li className="clothe-me__preview-empty">
                      {searchingColor ? 'Searching…' : 'Click a color to find pieces'}
                    </li>
                  )}
                </ul>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default ClotheMe
