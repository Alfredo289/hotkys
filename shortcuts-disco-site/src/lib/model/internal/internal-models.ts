import {Modifiers} from "./modifiers";

/**
 * Supported platform types
 */
export type Platform = 'windows' | 'linux' | 'macos';

export interface Shortcuts {
    applications: AppShortcuts[];
}

export interface AppShortcuts {
    bundleId?: string;
    windowsAppId?: string;
    windowsProcessName?: string;
    hostname?: string;
    name: string;
    slug: string;
    source?: string;
    icon?: string;
    keymaps: Keymap[];
}

export interface Keymap {
    title: string;
    platforms?: Platform[];
    sections: Section[];
}

export interface Section {
    title: string;
    hotkeys: SectionShortcut[];
}

export interface SectionShortcut {
    title: string;
    sequence: AtomicShortcut[];
    comment?: string;
    baseSectionTitle?: string;
    baseShortcutTitle?: string;
    baseShortcutId?: string;
    baseShortcutAliases?: string[];
}

export interface AtomicShortcut {
    base: string;
    modifiers: Modifiers[];
}
