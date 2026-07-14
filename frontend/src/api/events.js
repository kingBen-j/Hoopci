import client from './client.js'

export const getEvenements = (params) =>
  client.get('/events/', { params })

export const getEvenement = (id) =>
  client.get(`/events/${id}/`)

export const createEvenement = (data) =>
  client.post('/events/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

export const updateEvenement = (id, data) =>
  client.patch(`/events/${id}/`, data)

export const toggleInteresse = (id) =>
  client.post(`/events/${id}/interesse/`)

export const getMesEvenements = () =>
  client.get('/events/mes-evenements/')

export const getClassementPromoteurs = (params) =>
  client.get('/promoteurs/', { params })
