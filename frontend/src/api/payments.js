import client from './client.js'

export const initierPaiementTournoi = (tournoiId) =>
  client.post(`/payments/tournois/${tournoiId}/initier/`)

export const initierPaiementEquipe = (equipeId) =>
  client.post(`/payments/equipes/${equipeId}/initier/`)

export const promouvoirEquipe = (equipeId) =>
  client.post(`/payments/equipes/${equipeId}/promouvoir/`)

export const initierPromotionCompte = () =>
  client.post('/payments/carte/initier/')

export const getStatutPaiement = (reference) =>
  client.get(`/payments/${reference}/`)

export const simulerPaiement = (reference) =>
  client.post(`/payments/${reference}/simuler/`)
