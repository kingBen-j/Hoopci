import client from './client.js'

export const getJoueurs = (params) =>
  client.get('/players/', { params })

export const getJoueur = (id) =>
  client.get(`/players/${id}/`)

export const getMonProfil = () =>
  client.get('/players/moi/')

export const updateMonProfil = (data) =>
  client.patch('/players/moi/', data)
