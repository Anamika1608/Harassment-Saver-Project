import React from 'react';

const Navbar = () => {
  return (
    <nav className="w-[1000px] mx-auto py-2 px-6 sticky top-2 z-10">
      <div className="max-w-7xl mx-auto rounded-4xl border border-[#402E7F] p-2"
           style={{
             background: 'linear-gradient(0deg, rgba(37, 32, 66, 0.50) 0%, rgba(41, 41, 82, 0.50) 109.33%)',
             boxShadow: '0px 10px 26.2px 15px rgba(102, 61, 158, 0.21)',
             backdropFilter: 'blur(20px)'
           }}>
        <div className="flex items-center justify-between">
          
          <div className="text-purple-600 text-2xl mx-8 font-bold">
            SafeDM
          </div>

          
          <div className="flex items-center justify-center space-x-8">
            <a href="#" className="text-white hover:text-purple-400 transition-colors">
              Home
            </a>
            <a href="#" className="text-white hover:text-purple-400 transition-colors">
              How it works
            </a>
            <a href="#" className="text-white hover:text-purple-400 transition-colors">
              Features
            </a>
          </div>

          
          <a href="http://localhost:3000/auth/sign-in" className="bg-purple-600 text-white px-6 py-2 rounded-full hover:bg-purple-700 transition-colors">
            Sign in
          </a>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;