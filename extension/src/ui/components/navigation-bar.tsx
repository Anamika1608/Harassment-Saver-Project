import React from 'react';
import { Home, BarChart2, List, Settings2, MessageSquare, Hash } from 'lucide-react';
import { useNavigation } from '../popupui';

const navigationItems = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'blocked', icon: List, label: 'Blocked' },
    { id: 'keywords', icon: Hash, label: 'Keywords' } 
];

const NavigationBar = () => {
    const { currentPage, setCurrentPage } = useNavigation();

    return (
        <div className="plasmo-fixed plasmo-bottom-0 plasmo-left-0 plasmo-right-0 plasmo-border-t plasmo-border-gray-800 plasmo-bg-gray-900 plasmo-p-2">
            <div className="plasmo-flex plasmo-justify-around">
                {navigationItems.map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setCurrentPage(id)}
                        className={`plasmo-p-2 plasmo-rounded-md plasmo-flex plasmo-flex-col plasmo-items-center plasmo-gap-1
                            ${currentPage === id ? 'plasmo-text-blue-500' : 'plasmo-text-gray-400 hover:plasmo-text-gray-300'}`}
                    >
                        <Icon className="plasmo-w-5 plasmo-h-5" />
                        <span className="plasmo-text-xs">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default NavigationBar;