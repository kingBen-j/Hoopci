import client from './client.js'

export const login = (email, password) =>
  client.post('/auth/login/', { email, password })

export const register = (data) =>
  client.post('/auth/register/', data)

export const getMe = () =>
  client.get('/auth/me/')

export const updateMe = (data) =>
  client.patch('/auth/me/', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
