import axios from 'axios';

const api = axios.create({
  baseURL: '/api'
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('edutrack_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Global response interceptor for 401 handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      // localStorage.removeItem('edutrack_token');
      // localStorage.removeItem('edutrack_user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  getDemoUsers: () => api.get('/auth/demo-users'),
  register: (data) => api.post('/auth/register', data)
};

export const subjectsAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  getById: (id) => api.get(`/subjects/${id}`),
  getStudents: (id) => api.get(`/subjects/${id}/students`),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`)
};

export const sectionsAPI = {
  getAll: () => api.get('/sections'),
  getById: (id) => api.get(`/sections/${id}`),
  create: (data) => api.post('/sections', data),
  enroll: (sectionId, studentId) => api.post(`/sections/${sectionId}/enroll`, { student_id: studentId })
};

export const attendanceAPI = {
  getSessions: (subjectId) => api.get('/attendance/sessions', { params: { subjectId } }),
  getSession: (id) => api.get(`/attendance/sessions/${id}`),
  createSession: (data) => api.post('/attendance/sessions', data),
  updateSession: (id, data) => api.put(`/attendance/sessions/${id}`, data),
  deleteSession: (id) => api.delete(`/attendance/sessions/${id}`),
  getStudentAttendance: (studentId, subjectId) => api.get(`/attendance/student/${studentId}`, { params: { subjectId } })
};

export const assessmentsAPI = {
  getAll: (subjectId) => api.get('/assessments', { params: { subjectId } }),
  getMarks: (id) => api.get(`/assessments/${id}/marks`),
  create: (data) => api.post('/assessments', data),
  saveMarks: (id, marks) => api.post(`/assessments/${id}/marks`, { marks }),
  update: (id, data) => api.put(`/assessments/${id}`, data),
  delete: (id) => api.delete(`/assessments/${id}`)
};

export const statsAPI = {
  getStudentDashboard: (studentId) => api.get('/stats/student-dashboard', { params: { studentId } }),
  getFacultyDashboard: () => api.get('/stats/faculty-dashboard')
};

export const studentsAPI = {
  getAll: () => api.get('/students'),
  getById: (id) => api.get(`/students/${id}`)
};

export const correctionsAPI = {
  submit: (data) => api.post('/corrections', data),
  getStudentCorrections: () => api.get('/corrections/student'),
  getFacultyCorrections: (params) => api.get('/corrections/faculty', { params }),
  approve: (id, decision_reason) => api.post(`/corrections/${id}/approve`, { decision_reason }),
  reject: (id, decision_reason) => api.post(`/corrections/${id}/reject`, { decision_reason }),
  withdraw: (id) => api.post(`/corrections/${id}/withdraw`),
  getAuditHistory: (recordId) => api.get(`/corrections/audit/${recordId}`)
};

export const uciAPI = {
  getMetadata: () => api.get('/uci/metadata'),
  getRecords: (params) => api.get('/uci/records', { params }),
  getAnalytics: () => api.get('/uci/analytics')
};

export default api;
