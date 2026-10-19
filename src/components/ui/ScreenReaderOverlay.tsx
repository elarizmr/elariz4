import { useScene } from '../../context/SceneContext';
import { GALLERY_PROJECTS } from '../../data/galleryProjects';

const ScreenReaderOverlay = () => {
    const { hasEntered, isInRoom, currentRoom, teleportTo, requestExit } = useScene();
    
    return (
        <div className="pointer-events-none fixed inset-0 z-1 [&_a]:pointer-events-auto [&_button]:pointer-events-auto" role="complementary" aria-label="Accessible navigation for 3D portfolio">
            <a
                href="#sr-main-nav"
                className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-10000 focus:rounded-lg focus:bg-[#1a1a1a] focus:px-5 focus:py-3 focus:font-sans focus:text-sm focus:font-semibold focus:text-white focus:shadow-[0_4px_12px_rgba(0,0,0,0.3)] focus:no-underline"
            >
                Skip to accessible navigation
            </a>

            <nav id="sr-main-nav" className="sr-only" aria-label="Portfolio rooms">
                <h1>Elariz — Creative Developer Portfolio</h1>
                <h2>Portfolio Navigation</h2>

                {!hasEntered && (
                    <p>Welcome to Elariz's interactive 3D portfolio. Click or press Enter on the doors to enter.</p>
                )}

                {hasEntered && !isInRoom && (
                    <>
                        <p>You are in the corridor. Choose a room to explore:</p>
                        <ul>
                            <li>
                                <button onClick={() => teleportTo('about')} type="button">
                                    About — My story, skills, and journey
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('gallery')} type="button">
                                    The Gallery — My projects and work
                                </button>
                            </li>
                            <li>
                                <button onClick={() => teleportTo('contact')} type="button">
                                    Contact — Get in touch with me
                                </button>
                            </li>
                        </ul>
                    </>
                )}

                {hasEntered && isInRoom && (
                    <>
                        <p>
                            You are in the {currentRoom === 'about' ? 'About' :
                                currentRoom === 'gallery' ? 'Gallery' :
                                    currentRoom === 'contact' ? 'Contact' : currentRoom} room.
                        </p>
                        <button onClick={requestExit} type="button">
                            Go back to corridor
                        </button>

                        {currentRoom === 'about' && (
                            <div aria-label="About room content">
                                <h3>About Me</h3>
                                <p>This room contains my personal story, journey milestones, and technology skills displayed as interactive balloons.</p>
                            </div>
                        )}
                        {currentRoom === 'gallery' && (
                            <div aria-label="Gallery room content">
                                <h3>My Projects</h3>
                                <p>Browse through my portfolio projects displayed on paper cards. Click on a project card to see details and visit the live site.</p>
                                
                                <ul>
                                    {GALLERY_PROJECTS.map((p) => (
                                        <li key={p.id}>
                                            <h4>{p.title}</h4>
                                            <p>{p.description}</p>
                                            {p.url && <a href={p.url}>Visit {p.title}</a>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {currentRoom === 'contact' && (
                            <div aria-label="Contact room content">
                                <h3>Contact Me</h3>
                                <p>Find my social media links displayed as floating barrels. Click to visit my profiles on LinkedIn, GitHub, and other platforms.</p>
                            </div>
                        )}
                        <h3>Quick Navigation</h3>
                        <ul>
                            {currentRoom !== 'about' && (
                                <li><button onClick={() => teleportTo('about')} type="button">Go to About</button></li>
                            )}
                            {currentRoom !== 'gallery' && (
                                <li><button onClick={() => teleportTo('gallery')} type="button">Go to Gallery</button></li>
                            )}
                            {currentRoom !== 'contact' && (
                                <li><button onClick={() => teleportTo('contact')} type="button">Go to Contact</button></li>
                            )}
                        </ul>
                    </>
                )}
            </nav>

            <div aria-live="polite" aria-atomic="true" className="sr-only">
                {isInRoom && `Entered ${currentRoom} room`}
            </div>
        </div>
    );
};

export default ScreenReaderOverlay;
