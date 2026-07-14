import { useEffect, useState, useCallback } from 'react'

// Incrémenter la version force le ré-affichage de l'intro après une refonte majeure
const VU_KEY = 'hoopci-onboarding-v1'
const DUREE_SLIDE = 4000

// Slides d'introduction — photos basket/foot déjà embarquées (public/hero)
const SLIDES = [
  {
    img: '/hero.webp',
    kicker: 'Bienvenue',
    titre: 'Le sport de rue ivoirien a sa maison',
    texte: 'Tournois de basket (3x3, 5x5) et de football maracana près de chez toi, partout à Abidjan.',
  },
  {
    img: '/hero/basket-2.webp',
    kicker: 'Joue',
    titre: 'Inscris ton équipe',
    texte: 'Trouve un tournoi ouvert, inscris ton équipe et rassemble tes coéquipiers en quelques clics.',
  },
  {
    img: '/hero/foot-2.webp',
    kicker: 'Progresse',
    titre: 'Monte en grade',
    texte: 'Des statistiques vérifiées après chaque match. Gagne des points et grimpe de Bronze à Légende.',
  },
  {
    img: '/hero/foot-1.webp',
    kicker: 'Fais-toi repérer',
    titre: 'Le marché de talents',
    texte: 'Rends ton profil visible, reçois des offres, ou recrute les meilleurs joueurs de la ville.',
  },
]

export default function Onboarding() {
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(VU_KEY) } catch { return false }
  })
  const [i, setI] = useState(0)

  const fermer = useCallback(() => {
    try { localStorage.setItem(VU_KEY, '1') } catch { /* mode privé : on ferme quand même */ }
    setVisible(false)
  }, [])

  // Défilement automatique des slides ; la dernière ne s'auto-avance pas
  useEffect(() => {
    if (!visible || i >= SLIDES.length - 1) return undefined
    const id = setTimeout(() => setI((n) => n + 1), DUREE_SLIDE)
    return () => clearTimeout(id)
  }, [visible, i])

  // Précharge les images pour un défilement fluide
  useEffect(() => {
    if (!visible) return
    SLIDES.forEach((s) => { const img = new Image(); img.src = s.img })
  }, [visible])

  if (!visible) return null

  const dernier = i === SLIDES.length - 1
  const s = SLIDES[i]

  return (
    <div className="onb" role="dialog" aria-modal="true" aria-label="Présentation de HoopCI">
      {/* Photos empilées en fondu croisé */}
      {SLIDES.map((slide, idx) => (
        <div
          key={slide.img}
          className={`onb-bg ${idx === i ? 'on' : ''}`}
          style={{ backgroundImage: `url(${slide.img})` }}
        />
      ))}
      <div className="onb-veil" />

      <button className="onb-skip" onClick={fermer}>Passer</button>

      <div className="onb-body">
        <span className="kicker orange">{s.kicker}</span>
        <h2 key={s.titre} className="onb-titre">{s.titre}</h2>
        <p key={s.texte} className="onb-texte">{s.texte}</p>

        {/* Barres de progression : une par slide, celle en cours se remplit */}
        <div className="onb-dots">
          {SLIDES.map((slide, idx) => (
            <button
              key={slide.img}
              className={`onb-dot ${idx === i ? 'actif' : ''} ${idx < i ? 'passe' : ''}`}
              aria-label={`Étape ${idx + 1}`}
              onClick={() => setI(idx)}
            >
              <i style={{ animationDuration: idx === i && !dernier ? `${DUREE_SLIDE}ms` : undefined }} />
            </button>
          ))}
        </div>

        <button className="btn block onb-cta" onClick={() => (dernier ? fermer() : setI((n) => n + 1))}>
          <span>{dernier ? 'Entrer sur HoopCI' : 'Suivant'}</span>
        </button>
      </div>
    </div>
  )
}
