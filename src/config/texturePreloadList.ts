import { GALLERY_PROJECTS } from '../data/galleryProjects';

export const ENTRANCE_TEXTURES = [
    '/textures/paper-texture.webp',
    '/textures/doors/frame_sketch.webp',
    '/textures/doors/door_left_sketch.webp',
    '/textures/doors/door_right_sketch.webp',
    '/textures/doors/handle_left_sketch.webp',
    '/textures/doors/handle_right_sketch.webp',
    '/textures/doors/door_back_left_sketch.webp',
    '/textures/doors/pien.webp',
    '/textures/entrance/wall_bricks_2.webp',
    '/textures/entrance/stone-path.webp',
    '/textures/entrance/floor_paper.webp',
    '/textures/entrance/belka.webp',
    '/textures/entrance/sign.webp',
    '/textures/entrance/cat_front_body.webp',
    '/textures/entrance/window_sketch.webp',
    '/textures/entrance/avatar_window.webp',
    '/textures/entrance/tree_sketch.webp',
    '/textures/entrance/mouse_hanging.webp',
    '/textures/entrance/bug_sketch.webp',
    '/images/ink-splash.webp',
];

export const CORRIDOR_TEXTURES = [
    '/textures/corridor/wall_texture.webp',
    '/textures/corridor/kawalekpodlogi.webp',
    '/textures/corridor/texturadoprogow.webp',
    '/textures/corridor/ceiling_texture.webp',
    '/textures/corridor/avatar_sketch.webp',
    '/textures/corridor/doors/frame_sketch.webp',
    '/textures/corridor/doors/doorrleft.webp',
    '/textures/corridor/doors/dorright.webp',
    '/textures/corridor/doors/handle_left_sketch.webp',
    '/textures/corridor/doors/handle_right_sketch.webp',
    '/textures/corridor/doors/pien.webp',
    '/textures/corridor/doors/ramkasingledoors.webp',
    '/textures/corridor/doors/klamkadodrzwi.webp',
    '/textures/corridor/doors/backsingledoors.webp',
    '/textures/corridor/doors/gallery-door.webp',
    '/textures/corridor/doors/about-door.webp',
    '/textures/corridor/doors/contact-door.webp',
    '/textures/corridor/doors/gallery-door_painted.webp',
    '/textures/corridor/doors/about-door_painted.webp',
    '/textures/corridor/doors/contact-door_painted.webp',
    '/textures/corridor/pustatabliczka.webp',
    '/textures/corridor/decorations/paper_ball.webp',
    '/textures/corridor/decorations/paper_airplane.webp',
    '/textures/corridor/decorations/pencil.webp',
    '/textures/corridor/decorations/coffee_cup.webp',
    '/textures/corridor/ramkanazdjecieduza.webp',
    '/textures/corridor/ramkanazdjecieduza_painted.webp',
    '/textures/corridor/ramkanazdjeciemala.webp',
    '/textures/corridor/kratkawentylacyjna.webp',
    '/textures/corridor/kratanalampy.webp',
    '/textures/corridor/bokilampy.webp',
    '/textures/corridor/szafkaprzod.webp',
    '/textures/corridor/szafkaprzodgora.webp',
    '/textures/corridor/strzalka.webp',
    '/textures/corridor/doors/door_back.webp',
    '/textures/corridor/doors/klamkadodrzwi_painted.webp',
];

export const IMAGE_ASSETS = [
    '/images/avatar-thinking.webp',
    '/images/avatar-hero.webp',
    '/images/ink-splash.webp',
    '/images/map.webp',
    '/images/map_about_painted.webp',
    '/images/map_contact_painted.webp',
    '/images/map_gallery_painted.webp',
    '/images/pin.webp',
    '/images/pin-slot.webp',
];

export const UI_TEXTURES = [
    '/textures/corridor/avatar_anim/1.webp',
    '/textures/corridor/avatar_anim/2.webp',
    '/textures/corridor/avatar_anim/3.webp',
    '/textures/corridor/avatar_anim/4.webp',
    '/textures/corridor/avatar_anim/5.webp',
    '/textures/corridor/avatar_anim/6.webp',
    '/textures/corridor/avatar_anim/7.webp',
    '/textures/corridor/avatar_anim/8.webp',
    '/textures/corridor/avatar_anim/9.webp',
];


export const GALLERY_TEXTURES_BASE = [
    '/textures/gallery/floor.webp',
    '/textures/gallery/railing.webp',
    '/textures/gallery/domki.webp',
    '/textures/gallery/miastotlo.webp',
    '/textures/gallery/bird_gray.webp',
    '/textures/gallery/klamerka.webp',
    '/textures/gallery/openliveproject.webp',
];

const GALLERY_LOGO_TEXTURES = [
    'csslogo',
    'elementorlogo',
    'firebaselogo',
    'htmllogo',
    'jslogo',
    'netlifylogo',
    'phplogo',
    'reactlogo',
    'tailwindlogo',
    'wordpresslogo',
];

export const GALLERY_TEXTURES = [
    ...GALLERY_TEXTURES_BASE,
    ...GALLERY_PROJECTS.flatMap(({ front, painted }) => painted ? [front, painted] : [front]),
    ...['tylkartki', 'przyciskdotylukartki'].flatMap(name => [
        `/textures/gallery/${name}.webp`,
        `/textures/gallery/${name}_painted.webp`
    ]),
    ...GALLERY_LOGO_TEXTURES.flatMap(name => [
        `/textures/gallery/${name}.webp`,
        name === 'csslogo' ? '/textures/gallery/css3logo_painted.webp' : `/textures/gallery/${name}_painted.webp`
    ])
];

export const CONTACT_TEXTURES = [
    '/textures/contact/top-down-waves.webp',
    '/textures/contact/pier.webp',
    '/textures/contact/lamp.webp',
    '/textures/contact/ship.webp',
    '/textures/contact/paper_form.webp',
    '/textures/contact/send_button.webp',
    '/textures/contact/barrel.webp',
    '/textures/contact/barrel_painted.webp',
];

export const ABOUT_TEXTURES = [
    '/textures/about/awatarnachmurce.webp',
    '/textures/about/freelancewyspa.webp',
    '/textures/about/reactduzybalon.webp',
    '/textures/about/reactduzybalon_painted.webp',
    '/textures/about/JSSREDNIBALON.webp',
    '/textures/about/JSSREDNIBALON_painted.webp',
    '/textures/about/csssrednibalon.webp',
    '/textures/about/csssrednibalon_painted.webp',
    '/textures/about/nextjssrednibalon.webp',
    '/textures/about/nextjssrednibalon_painted.webp',
    '/textures/about/htmlmalybalon.webp',
    '/textures/about/htmlmalybalon_painted.webp',
    '/textures/about/gitmalybalon.webp',
    '/textures/about/gitmalybalon_painted.webp',
    '/textures/about/figmamalybalon.webp',
    '/textures/about/figmamalybalon_painted.webp',
    '/textures/about/firebasemalybalon.webp',
    '/textures/about/firebasemalybalon_painted.webp',
    '/textures/clouds/1131c3eb-dfae-423f-924b-ff39d8ccd6dc.webp',
    '/textures/clouds/254b8ec8-d6f7-4275-956f-7bab65b2ce2d.webp',
    '/textures/clouds/2cc88dd1-483c-466d-b07e-f8308c61ccbe.webp',
    '/textures/clouds/5606fcc0-3252-447d-a58a-7bcbac73229a.webp',
    '/textures/clouds/7882dc72-3d01-41fb-ac0e-d07b0184ebc1.webp',
    '/textures/clouds/9b2ca72f-7bd0-473b-ba6e-dd9e0eb79d35.webp',
    '/textures/clouds/c83293c6-d90c-4a32-8d9d-5ac9af7e2296.webp',
    '/textures/clouds/f6e358bc-d27c-41dd-95f4-6787a835c41e.webp',
];

export const PRELOAD_ALL = [
    ...ENTRANCE_TEXTURES,
    ...CORRIDOR_TEXTURES,
    ...UI_TEXTURES,
    ...GALLERY_TEXTURES,
    ...CONTACT_TEXTURES,
    ...IMAGE_ASSETS,
];


export const PRELOAD_LOADER = [
    ...ABOUT_TEXTURES,
];

export const filterTexturesByDevice = (list: string[], usePainted: boolean): string[] => {
    const paintedVersions = new Set(list.filter((p) => p.includes('_painted.webp')));
    
    const hasCss3Painted = list.some((p) => p.includes('css3logo_painted.webp'));
    
    return list.filter(path => {
        const isPainted = path.includes('_painted.webp');
        const isCss3 = path.includes('css3logo_painted.webp');
        
        let standardVersion = null;
        if (isPainted) {
            standardVersion = path.replace('_painted.webp', '.webp');
        } else if (isCss3) {
            standardVersion = path.replace('css3logo_painted.webp', 'csslogo.webp');
        } else {
            const pVersion = path.replace('.webp', '_painted.webp');
            const css3Version = path.replace('csslogo.webp', 'css3logo_painted.webp');
            if (list.includes(pVersion) || (path.includes('csslogo.webp') && hasCss3Painted)) {
                return true; 
            }
            return true;
        }

        return usePainted;
    });
};
