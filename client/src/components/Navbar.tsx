import React, {useEffect, useRef, useState} from 'react';

interface NavbarProps {
    barTitle: string;
    onBackClick: () => void;
    children?: React.ReactNode;
}

function Navbar({onBackClick, barTitle, children}: NavbarProps) {

    const titleRef = useRef<HTMLDivElement>(null);
    const [shouldAnimate, setShouldAnimate] = useState(false);

    useEffect(() => {
        const el = titleRef.current;
        if (el) {
            setShouldAnimate(el.scrollWidth > el.clientWidth);
        }
    }, [children]);


    return (
        <nav className="bg-black border-b border-gray-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center min-w-0 flex-1 gap-4">
                        <button
                            onClick={onBackClick}
                            className="text-gray-400 hover:text-white flex-shrink-0"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                            </svg>
                        </button>
                        <div className="text-sm font-bold text-white flex items-baseline gap-2 min-w-0 flex-1">
                            <span className="flex-shrink-0 text-xl">{barTitle}</span>
                            <div ref={titleRef} className="overflow-hidden relative flex-1 marquee-container"
                                 style={{overflow: "hidden", whiteSpace: "nowrap"}}>
                                <div  style={{ display: "inline-block" }} className={`whitespace-nowrap inline-flex ${shouldAnimate ? 'animate-marquee' : ''}`}>
                                    {children}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
