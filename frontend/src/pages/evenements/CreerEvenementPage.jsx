import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Timer, Rocket, Plus, Minus } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { createEvenement } from '../../api/events.js'
import { useToast } from '../../components/ui/Toast.jsx'
import { COMMUNES, SPORTS, TYPES_EVENEMENT, apiError } from '../../lib/constants.js'

/**
 * Publication d'un événement (basket ou football) par un promoteur.
 * Publication gratuite et immédiate dans l'agenda.
 */
export default function CreerEvenementPage() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, setError } = useForm({
    defaultValues: { sport: 'basket', type_evenement: 'exhibition', prix_entree: 0 },
  })
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  // Champs facultatifs repliés par défaut — moins de questions à la publication
  const [details, setDetails] = useState(false)
  const dateDebut = watch('date_debut')

  const onSubmit = async (data) => {
    try {
      // Événement sur une journée si la date de fin n'est pas renseignée
      if (!data.date_fin) data.date_fin = data.date_debut
      const fd = new FormData()
      Object.entries(data).forEach(([k, v]) => {
        if (k === 'affiche') {
          if (v?.[0]) fd.append('affiche', v[0])
        } else if (v !== '' && v != null) {
          fd.append(k, v)
        }
      })
      const { data: evenement } = await createEvenement(fd)
      qc.invalidateQueries({ queryKey: ['evenements'] })
      qc.invalidateQueries({ queryKey: ['mes-evenements'] })
      toast('Événement publié — visible dans l’agenda !')
      navigate(`/evenements/${evenement.id}`)
    } catch (e) {
      setError('root', { message: apiError(e) })
    }
  }

  return (
    <div className="form-page">
      <span className="kicker orange">Espace promoteur</span>
      <h1 style={{ fontSize: 32, margin: '10px 0 4px' }}>
        Publier un <span style={{ color: 'var(--orange)' }}>événement</span>
      </h1>
      <p className="muted mb" style={{ fontSize: 13 }}>
        <Timer size={13} style={{ verticalAlign: '-2px' }} /> Exhibition, camp, dunk contest, animation… L'événement apparaît immédiatement dans l'agenda.
      </p>

      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label>Titre *</label>
          <input {...register('titre', { required: 'Titre requis' })} placeholder="Ex. All-Star Game du Street" />
          {errors.titre && <p className="err">{errors.titre.message}</p>}
        </div>

        <div className="row2">
          <div className="field">
            <label>Sport *</label>
            <select {...register('sport', { required: true })}>
              {Object.entries(SPORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Type d'événement *</label>
            <select {...register('type_evenement', { required: true })}>
              {Object.entries(TYPES_EVENEMENT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
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
            <input {...register('lieu', { required: 'Lieu requis' })} placeholder="Terrain, salle, quartier" />
            {errors.lieu && <p className="err">{errors.lieu.message}</p>}
          </div>
        </div>

        <div className="field">
          <label>Date *</label>
          <input type="date" {...register('date_debut', { required: 'Date requise' })} />
          {errors.date_debut && <p className="err">{errors.date_debut.message}</p>}
        </div>

        {/* L'essentiel est au-dessus : le reste est facultatif ou pré-rempli
            (entrée gratuite, événement sur une journée) */}
        <button type="button" className="chip" onClick={() => setDetails(!details)} style={{ alignSelf: 'flex-start' }}>
          {details
            ? <><Minus size={13} style={{ verticalAlign: '-2px' }} /> Masquer les détails</>
            : <><Plus size={13} style={{ verticalAlign: '-2px' }} /> Plus de détails (description, heure, prix, affiche…)</>}
        </button>

        <div style={{ display: details ? 'contents' : 'none' }}>
          <div className="field">
            <label>Description</label>
            <textarea {...register('description')} placeholder="Programme, invités, ambiance, récompenses…" />
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
              <label>Heure</label>
              <input type="time" {...register('heure')} />
            </div>
          </div>

          <div className="row2">
            <div className="field">
              <label>Prix d'entrée (FCFA)</label>
              <input type="number" min="0" step="500" {...register('prix_entree', { min: 0 })} />
            </div>
            <div className="field">
              <label>Contact (téléphone affiché au public)</label>
              <input {...register('contact')} placeholder="+225 07 …" />
            </div>
          </div>

          <div className="field">
            <label>Affiche de l'événement (JPG/PNG)</label>
            <input type="file" accept="image/*" {...register('affiche')} />
          </div>
        </div>

        {errors.root && <p className="alert red">{errors.root.message}</p>}

        <button className="btn block" type="submit" disabled={isSubmitting}>
          <span>{isSubmitting ? 'Publication…' : <><Rocket size={16} /> Publier l'événement</>}</span>
        </button>
      </form>
    </div>
  )
}
