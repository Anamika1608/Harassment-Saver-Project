import React, { useState, useEffect, useContext } from 'react';
import { Settings2, Shield, X } from 'lucide-react';
import HomePage from './pages/home';
import SettingsPage from './pages/messages';
import ReportsPage from './pages/reports';
import BlockedPage from './pages/blocked';
import NavigationBar from './components/navigation-bar';
import { isAuthenticated } from '../utils/auth';
import ProfileSection from './components/profile-dropdown';
import { createContext } from 'react';
import MessagesPage from './pages/messages';
import KeywordsPage from './pages/keywords';


const NavigationContext = createContext({
  currentPage: 'home',
  setCurrentPage: (page: string) => {},
});

export const useNavigation = () => useContext(NavigationContext);

const PopupUI = () => {
    const [currentPage, setCurrentPage] = useState('home');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const authenticated = await isAuthenticated();
            setIsLoggedIn(authenticated);
        };
        checkAuth();
    }, []);

    const renderPage = () => {
        switch (currentPage) {
            case 'settings':
                return <SettingsPage />;
            case 'reports':
                return <ReportsPage />;
            case 'blocked':
                return <BlockedPage />;
            case 'messages':
                return <MessagesPage />;
            case 'keywords':
                return <KeywordsPage />;
            case 'home':
            default:
                return <HomePage />;
        }
    };

    return (
        <NavigationContext.Provider value={{ currentPage, setCurrentPage }}>
            <div className="plasmo-w-[320px] plasmo-h-[480px] plasmo-bg-gray-900 plasmo-text-white plasmo-font-sans plasmo-flex plasmo-flex-col">
                <Header />
                <div className="plasmo-flex-1 plasmo-overflow-auto plasmo-pb-16 no-scrollbar plasmo-overflow-y-auto">
                    {renderPage()}
                </div>
                <NavigationBar/>
            </div>
        </NavigationContext.Provider>
    );
};

const Header = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const authenticated = await isAuthenticated();
            setIsLoggedIn(authenticated);
        };
        checkAuth();
    }, []);

    const handleLogin = () => {
        if (!isLoggedIn) {
          chrome.runtime.sendMessage({ action: "initiateLogin" });
        }
    };

    const handleClose = () => {
        window.close();
    };

    return (
        <div className='plasmo-p-4'>
            <div className="plasmo-flex plasmo-items-center plasmo-justify-between">
                <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                    <div className="plasmo-w-8 plasmo-h-8 plasmo-bg-blue-600 plasmo-rounded-lg plasmo-flex plasmo-items-center plasmo-justify-center">
                        <Shield className="plasmo-w-5 plasmo-h-5" />
                    </div>
                    <span className="plasmo-text-lg plasmo-font-medium">SafeDM</span>
                </div>
                <div className="plasmo-flex plasmo-items-center plasmo-gap-2">
                    <ProfileSection />
                    <button className="plasmo-p-1 plasmo-hover:bg-gray-800 plasmo-rounded-md plasmo-transition-colors" onClick={handleClose}>
                        <X/>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PopupUI;