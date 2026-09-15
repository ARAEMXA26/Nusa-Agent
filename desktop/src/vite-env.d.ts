/// <reference types="vite/client" />

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

interface Window {
  nusa?: {
    platform: string;
    getAppInfo: () => Promise<any>;
    checkForUpdates: () => Promise<any>;
    installUpdate: (url?: string) => Promise<any>;
    onUpdateProgress: (callback: (data: { percent: number; status: string }) => void) => void;
    onUpdateAvailable: (callback: (result: any) => void) => void;
    onUpdateResult: (callback: (result: any) => void) => void;
    workspace?: {
      openFolder: () => Promise<string | null>;
      readDir: (dirPath: string) => Promise<{ success: boolean; error?: string; entries: Array<{ name: string; path: string; is_dir: boolean; is_symlink: boolean }> }>;
      readFile: (filePath: string) => Promise<{ success: boolean; error?: string; content: string }>;
      writeFile: (filePath: string, content: string) => Promise<{ success: boolean; error?: string }>;
      createFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      createFolder: (dirPath: string) => Promise<{ success: boolean; error?: string }>;
      renameItem: (oldPath: string, newPath: string) => Promise<{ success: boolean; error?: string }>;
      deleteItem: (targetPath: string) => Promise<{ success: boolean; error?: string; trashed?: boolean }>;
      revealInFinder: (targetPath: string) => Promise<{ success: boolean; error?: string }>;
    };
    send: (channel: string, data: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => void;
  };
}
