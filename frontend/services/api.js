import axios from 'axios';

const API = axios.create({
  baseURL: 'https://studysync1-xzci.onrender.com',
  withCredentials: true,
});

export default API;