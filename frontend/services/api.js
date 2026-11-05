import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://studysync1-xzci.onrender.com',
  withCredentials: true,
});

export default API;