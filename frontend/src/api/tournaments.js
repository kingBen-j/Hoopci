import client from './client.js'

export const getTournois = (params) =>
  client.get('/tournaments/', { params })

export const getTournoi = (id) =>
  client.get(`/tournaments/${id}/`)

export const createTournoi = (data) =>
  client.post('/tournaments/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateTournoi = (id, data) =>
  client.patch(`/tournaments/${id}/`, data)

export const saisirResultat = (tournoiId, data) =>
  client.post(`/tournaments/${tournoiId}/resultat/`, data)

export const toggleFavori = (tournoiId) =>
  client.post(`/tournaments/${tournoiId}/favori/`)

export const getMesTournois = () =>
  client.get('/tournaments/mes-tournois/')

export const getFavoris = () =>
  client.get('/tournaments/favoris/')

export const getTournoisRecommandes = () =>
  client.get('/tournaments/recommandes/')

export const getPalmares = (params) =>
  client.get('/tournaments/palmares/', { params })

export const getClassementEquipes = () =>
  client.get('/tournaments/classement-equipes/')

export const inscrireEquipe = (tournoiId, nom, membres = []) =>
  client.post(`/tournaments/${tournoiId}/equipes/`, { nom, membres })

export const rejoindreEquipe = (tournoiId, equipeId) =>
  client.post(`/tournaments/${tournoiId}/rejoindre/`, { equipe: equipeId })

export const getMesEquipes = () =>
  client.get('/tournaments/mes-equipes/')
