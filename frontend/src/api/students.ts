const API_BASE = '/api';

export interface Grade {
  gradeId: string;
  gradeDescription: string;
}

export const studentsApi = {
  getGrades: async (): Promise<Grade[]> => {
    const response = await fetch(`${API_BASE}/students/grades`);
    if (!response.ok) {
      throw new Error('Failed to fetch grades');
    }
    return response.json();
  },
};
