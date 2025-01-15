import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { FaGoogle } from 'react-icons/fa';
import { X } from 'lucide-react';

interface LoginProps {
  onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isRegister) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                else {
                    alert('נשלח מייל אימות. אנא בדוק את תיבת הדואר שלך.');
                    onClose?.();
                }
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                else {
                    onClose?.();
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin,
                }
            });
            if (error) throw error;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {onClose && (
                <button
                    onClick={onClose}
                    className="absolute left-4 top-4 text-gray-400 hover:text-gray-600"
                >
                    <X className="h-6 w-6" />
                </button>
            )}
            
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                    {isRegister ? 'הרשמה למערכת' : 'התחברות למערכת'}
                </h2>
                <p className="mt-2 text-gray-600">
                    {isRegister ? 'כבר יש לך חשבון?' : 'אין לך חשבון עדיין?'}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        className="text-blue-600 hover:text-blue-800 mr-2"
                    >
                        {isRegister ? 'התחבר' : 'הירשם'}
                    </button>
                </p>
            </div>

            {error && (
                <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded mb-6">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        אימייל
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <div>
                    <label className="block text-gray-700 text-sm font-bold mb-2">
                        סיסמה
                    </label>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? 'מעבד...' : isRegister ? 'הרשמה' : 'התחברות'}
                </button>
            </form>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">
                        או המשך עם
                    </span>
                </div>
            </div>

            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-4 flex items-center justify-center bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
                <FaGoogle className="w-5 h-5 text-red-500 ml-2" />
                <span>Google</span>
            </button>
        </div>
    );
};

export default Login;