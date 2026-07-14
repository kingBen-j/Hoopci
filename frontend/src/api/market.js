import client from './client.js'

export const getCartes = (params) =>
  client.get('/market/cartes/', { params })

export const getMaCarte = () =>
  client.get('/market/cartes/moi/')

export const updateCarte = (data) =>
  client.put('/market/cartes/moi/', data)

export const getSuggestions = () =>
  client.get('/market/cartes/suggestions/')

export const getOffres = () =>
  client.get('/market/offres/')

export const envoyerOffre = (joueurId, message) =>
  client.post('/market/offres/', { joueur: joueurId, message })

export const repondreOffre = (offreId, statut) =>
  client.patch(`/market/offres/${offreId}/`, { statut })
