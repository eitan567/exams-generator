import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center py-16 sm:py-20">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
          מערכת מבחנים חכמה
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          צור, נהל ובדוק מבחנים בקלות עם עזרת בינה מלאכותית
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          {user ? (
            <button
              onClick={() => navigate('/dashboard')}
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              למערכת המבחנים
            </button>
          ) : (
            <div className="rounded-md shadow">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 md:py-4 md:text-lg md:px-10"
              >
                התחל עכשיו
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <h2 className="sr-only">תכונות</h2>
          <div className="grid grid-cols-1 gap-y-12 lg:grid-cols-3 lg:gap-x-8">
            {[
              {
                title: 'יצירת מבחנים חכמה',
                description: 'המערכת מייצרת באופן אוטומטי שאלות מותאמות מתוך חומר הלימוד שלך'
              },
              {
                title: 'ניהול קל ופשוט',
                description: 'ממשק ידידותי המאפשר לך לנהל את כל המבחנים במקום אחד'
              },
              {
                title: 'בדיקה אוטומטית',
                description: 'בדיקת מבחנים אוטומטית עם משוב מפורט לכל שאלה'
              }
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <h3 className="mt-3 text-xl font-medium text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-base text-gray-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
