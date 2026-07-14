import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Timer, Rocket, Star, Plus, Minus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createTournoi } from '../../api/tournaments.js'
import { useToast } from '../../components/ui/Toast.jsx'
import {
  COMMUNES, SPORTS, FORMATS_PAR_SPORT, FORMAT_LABELS, NIVEAUX, CATEGORIES_AGE,
  TARIF_CREATION_TOURNOI, TARIF_PUBLICATION_TOURNOI, fcfa, apiError,
} from '../../lib/constants.js'

/**
 * Création d'un tournoi (basket ou football) par un promoteur.
 * La publication est payante (TARIF_CREATION_TOURNOI) : le tournoi reste invisible
 * du public jusqu'au paiement ; la promotion optionnelle se fait après, depuis « Mes tournois ».
 */
export default function CreerTournoiPage() {
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { sport: 'basket', format: '3x3', niveau: 'intermediaire', categorie_age: 'open', frais_inscription: 0, nombre_equipes_max: 8 },
  })
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  // Champs facultatifs repliés par défaut — moins de questions à la publication
  const [details, setDetails] = useState(false)
  const dateDebut = watch('date_debut')
  // Le sport choisi détermine les formats proposés (3x3/5x5 vs maracana/7x7/11x11)
  const sport = watch('sport')

  const onSubmit = async (data) => {
    try {
      // Tournoi sur une journée si la date de fin n'est pas renseignée
      if (!data.date_fin) data.date_fin = data.date_debut
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'affiche') {
          if (v?.[0]) fd.append('affiche', v[0])
        } else if (v !== '' && v != null) {
          fd.append(k, v)
        }
      })
      const { data: tournoi } = await createTournoi(fd)
      qc.invalidateQueries({ queryKey: ['tournois'] })
      qc.invalidateQueries({ queryKey: ['mes-tournois'] })
      toast('Tournoi créé — règle les frais de publication pour le rendre visible.')
      navigate(`/paiement/tournoi/${tournoi.id}`)
    } catch (e) {
      setError('root', { message: apiError(e) })
    }
  }

  return (
    <div className="form-page">
      <span className="kicker orange">Espace promoteur</span>
      <h1 style={{ fontSize: 32, margin: '10px 0 4px' }}>
        Créer un <span style={{ color: 'var(--orange)' }}>tournoi</span>
      </h1>
      <p className="muted mb" style={{ fontSize: 13 }}>
        <Timer size={13} style={{ verticalAlign: '-2px' }} /> Créé en moins de 2 minutes. La publication dans
        l'annuaire coûte <b>{fcfa(TARIF_CREATION_TOURNOI)}</b> — ton tournoi devient visible dès le paiement confirmé.
      </p>
      <p className="alert green mb" style={{ fontSize: 12.5 }}>
        <Star size={13} style={{ verticalAlign: '-2px' }} /> Optionnel : après publication, tu pourras{' '}
        <b>promouvoir ton tournoi</b> pour <b>{fcfa(TARIF_PUBLICATION_TOURNOI)}</b> (badge « Promu », tête de liste,
        priorité dans les recommandations aux joueurs) depuis « Mes tournois ».
      </p>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label>Titre *</label>
          <input {...register('titre', { required: 'Titre requis' })} placeholder="Ex. Marcory Street Cup" />
          {errors.titre && <p className="err">{errors.titre.message}</p>}
        </div>

        <div className="row2">
          <div className="field">
            <label>Commune *</label>
            <select {...register('commune', { required: 'Commune requise' })}>
              <option value="">— Choisir —</option>
              {COMMUNES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {errors.commune && <p className="err">{errors.commune.message}</p>}
          </div>
          <div className="field">
            <label>Lieu *</label>
            <input {...register('lieu', { required: 'Lieu requis' })} placeholder="Terrain, quartier" />
            {errors.lieu && <p className="err">{errors.lieu.message}</p>}
          </div>
        </div>

        <div className="field">
          <label>Date *</label>
          <input type="date" {...register('date_debut', { required: 'Date requise' })} />
          {errors.date_debut && <p className="err">{errors.date_debut.message}</p>}
        </div>

        <div className="row2">
          <div className="field">
            <label>Sport *</label>
            {/* Changer de sport réinitialise le format sur le premier du sport choisi */}
            <select
              {...register('sport', { required: true })}
              onChange={(e) => {
                setValue('sport', e.target.value)
                setValue('format', FORMATS_PAR_SPORT[e.target.value][0])
              }}
            >
              {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Format *</label>
            <select {...register('format', { required: true })}>
              {FORMATS_PAR_SPORT[sport || 'basket'].map((f) => (
                <option key={f} value={f}>{FORMAT_LABELS[f] || f}</option>
              ))}
            </select>
          </div>
        </div>

        {/* L'essentiel est au-dessus : le reste est facultatif ou pré-rempli
            (niveau intermédiaire, gratuit, 8 équipes, tournoi sur une journée) */}
        <button type="button" className="chip" onClick={() => setDetails(!details)} style={{ alignSelf: 'flex-start' }}>
          {details
            ? <><Minus size={13} style={{ verticalAlign: '-2px' }} /> Masquer les détails</>
            : <><Plus size={13} style={{ verticalAlign: '-2px' }} /> Plus de détails (description, frais, affiche…)</>}
        </button>

        <div style={{ display: details ? 'contents' : 'none' }}>
          <div className="field">
            <label>Description</label>
            <textarea {...register('description')} placeholder="Ambiance, règles, programme, récompenses…" />
          </div>

          <div className="row2">
            <div className="field">
              <label>Date de fin (si plusieurs jours)</label>
              <input
                type="date"
                {...register('date_fin', {
                  validate: (v) => !v || !dateDebut || v >= dateDebut || 'Doit être après le début',
                })}
              />
              {errors.date_fin && <p className="err">{errors.date_fin.message}</p>}
            </div>
            <div className="field">
              <label>Niveau</label>
              <select {...register('niveau', { required: true })}>
                {Object.entries(NIVEAUX).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>

          <div className="field">
            <label>Catégorie d'âge</label>
            {/* Contrôlée à l'inscription via la date de naissance des joueurs */}
            <select {...register('categorie_age')}>
              {Object.entries(CATEGORIES_AGE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <div className="row2">
            <div className="field">
              <label>Équipes max</label>
              <input type="number" min="2" {...register('nombre_equipes_max', { min: 2 })} />
            </div>
            <div className="field">
              <label>Frais d'inscription (FCFA)</label>
              <input type="number" min="0" step="500" {...register('frais_inscription', { min: 0 })} />
            </div>
          </div>

          <div className="field">
            <label>Contact (téléphone affiché aux joueurs)</label>
            <input {...register('contact')} placeholder="+225 07 …" />
          </div>

          <div className="field">
            <label>Affiche du tournoi (JPG/PNG)</label>
            <input type="file" accept="image/*" {...register('affiche')} />
          </div>
        </div>

        {errors.root && <p className="alert red">{errors.root.message}</p>}

        <button className="btn block" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Création…' : <><Rocket size={16} /> Créer et passer au paiement</>}</span>
        </button>
      </form>
    </div>
  )
}
