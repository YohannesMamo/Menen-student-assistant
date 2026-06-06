import { useState, useEffect } from 'react';
import { authApi, type RegisterRequest } from '../api/auth';
import { studentsApi, type Grade } from '../api/students';

interface RegisterProps {
  setToken: (token: string) => void;
}

export default function Register({ setToken }: RegisterProps) {
  const [formData, setFormData] = useState({
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Email: '',
    Password: '',
    PhoneMobile: '',
    GradeId: '',
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);

  // Fetch grades on mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const data = await studentsApi.getGrades();
        setGrades(data);
        // Default to first grade if available
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, GradeId: data[0].gradeId }));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load grades');
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data: RegisterRequest = {
        Email: formData.Email,
        Password: formData.Password,
        FirstName: formData.FirstName || undefined,
        MiddleName: formData.MiddleName || undefined,
        LastName: formData.LastName || undefined,
        PhoneMobile: formData.PhoneMobile || undefined,
        GradeId: formData.GradeId || undefined,
      };
      const response = await authApi.register(data);
      setToken(response.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.1)', width: '100%', maxWidth: '500px' }}>
        <h2 style={{ marginBottom: '1.5rem', textAlign: 'center', color: '#333' }}>Register - Menen Student Assistant</h2>
        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>First Name</label>
              <input type="text" name="FirstName" value={formData.FirstName} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Middle Name</label>
              <input type="text" name="MiddleName" value={formData.MiddleName} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Last Name</label>
            <input type="text" name="LastName" value={formData.LastName} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Email *</label>
            <input type="email" name="Email" value={formData.Email} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Password *</label>
            <input type="password" name="Password" value={formData.Password} onChange={handleInputChange} required style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Phone Mobile</label>
            <input type="tel" name="PhoneMobile" value={formData.PhoneMobile} onChange={handleInputChange} style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginTop: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>Grade *</label>
            {loadingGrades ? (
              <div style={{ padding: '0.75rem', color: '#999', border: '1px solid #ddd', borderRadius: '4px' }}>
                Loading grades...
              </div>
            ) : (
              <select
                name="GradeId"
                value={formData.GradeId}
                onChange={handleSelectChange}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  backgroundColor: 'white',
                }}
              >
                <option value="" disabled>
                  Select a grade
                </option>
                {grades.map(grade => (
                  <option key={grade.gradeId} value={grade.gradeId}>
                    {grade.gradeDescription}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            type="submit"
            disabled={loading || loadingGrades}
            style={{
              width: '100%',
              marginTop: '1.5rem',
              padding: '0.75rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading || loadingGrades ? 'not-allowed' : 'pointer',
              opacity: loading || loadingGrades ? 0.7 : 1,
            }}
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', textAlign: 'center', color: '#666' }}>
          Already have an account? <a href="/login" style={{ color: '#4CAF50' }}>Login</a>
        </p>
      </div>
    </div>
  );
}