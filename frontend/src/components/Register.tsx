// src/components/Register.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface Grade {
  gradeId: string;
  gradeDescription: string;
}

const Register: React.FC = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    phoneMobile: '',
    gradeId: '',
    dateOfBirth: '',
    gender: ''
  });
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(true);
  const navigate = useNavigate();

  // Fetch grades on mount
  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const response = await fetch(`${API_URL}/students/grades`);
        if (!response.ok) {
          throw new Error('Failed to fetch grades');
        }
        const data = await response.json();
        setGrades(data);
        // Default to first grade if available
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, gradeId: data[0].gradeId }));
        }
      } catch (err) {
        console.error('Failed to load grades:', err);
      } finally {
        setLoadingGrades(false);
      }
    };
    fetchGrades();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!formData.email || !formData.password) {
        setError("Email and password are required");
        setLoading(false);
        return;
      }

      if (!formData.firstName || !formData.lastName) {
        setError("First name and last name are required");
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Email: formData.email,
          Password: formData.password,
          FirstName: formData.firstName,
          MiddleName: formData.middleName || undefined,
          LastName: formData.lastName,
          PhoneMobile: formData.phoneMobile || undefined,
          GradeId: formData.gradeId || undefined,
          DateOfBirth: formData.dateOfBirth || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Registration failed');
      }

      setSuccessMessage('Registration completed successfully! Redirecting...');
      
      login(data.token, {
        userId: data.userId,
        email: data.email,
        role: data.role,
        studentId: data.studentId,
        firstName: data.firstName
      });

      setTimeout(() => {
        if (!data.isProfileComplete) {
          navigate('/complete-profile');
        } else {
          navigate('/dashboard');
        }
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
          <p className="text-gray-500">Join Menen Student Assist today</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-xl text-sm font-medium flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 block ml-1">First Name *</label>
              <input
                type="text"
                name="firstName"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="First Name"
                value={formData.firstName}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 block ml-1">Last Name *</label>
              <input
                type="text"
                name="lastName"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="Last Name"
                value={formData.lastName}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block ml-1">Middle Name</label>
            <input
              type="text"
              name="middleName"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Middle Name (Optional)"
              value={formData.middleName}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block ml-1">Email Address *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block ml-1">Password *</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                name="password"
                required
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 block ml-1">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700 block ml-1">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block ml-1">Phone Number</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="tel"
                name="phoneMobile"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="+251 ..."
                value={formData.phoneMobile}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 block ml-1">Grade *</label>
            {loadingGrades ? (
              <div className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-400">
                Loading grades...
              </div>
            ) : (
              <select
                name="gradeId"
                required
                value={formData.gradeId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
              >
                <option value="" disabled>
                  Select Grade
                </option>
                {grades.map(grade => (
                  <option key={grade.gradeId} value={grade.gradeId}>
                    {grade.gradeDescription}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" required className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" />
            <p>
              I agree to the <a href="#" className="text-indigo-600 font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-indigo-600 font-semibold hover:underline">Privacy Policy</a>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || loadingGrades}
            className={`w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 ${
              loading || loadingGrades ? 'opacity-70 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                Create Account
              </>
            )}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-bold hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;